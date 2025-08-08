package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	DefaultDirMode  = 0o755
	DefaultFileMode = 0o644
	DefaultTimeout  = 30 * time.Second
)

type Config struct {
	BaseURL    string
	Verbose    bool
	Insecure   bool
	HTTPClient *http.Client
}

type HTTPError struct {
	StatusCode int
	Message    string
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s", e.StatusCode, e.Message)
}

func (c *Config) GetAuthHeaders() (map[string]string, error) {
	h := make(map[string]string)

	user := os.Getenv("GFARM_SASL_USER")
	pass := os.Getenv("GFARM_SASL_PASSWORD")

	if user == "anonymous" {
		return h, nil
	}
	if user != "" && pass != "" {
		auth := base64.StdEncoding.EncodeToString([]byte(user + ":" + pass))
		h["Authorization"] = "Basic " + auth
		return h, nil
	}

	tok, err := getJWTToken()
	if err != nil {
		return nil, fmt.Errorf("read JWT token: %w", err)
	}
	if tok != "" {
		h["Authorization"] = "Bearer " + tok
		return h, nil
	}
	return nil, fmt.Errorf("environment GFARM_SASL_USER/GFARM_SASL_PASSWORD or JWT_USER_PATH is required")
}

func getJWTToken() (string, error) {
	jwtPath := os.Getenv("JWT_USER_PATH")
	if jwtPath == "" {
		jwtPath = fmt.Sprintf("/tmp/jwt_user_u%d/token.jwt", os.Getuid())
	}
	b, err := os.ReadFile(jwtPath)
	if errors.Is(err, os.ErrNotExist) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	tok := strings.TrimSpace(string(b))
	if tok == "" {
		return "", fmt.Errorf("JWT token file is empty: %s", jwtPath)
	}
	return tok, nil
}

// Encode each path segment but keep slashes as separators.
func encodePath(p string) string {
	p = strings.TrimPrefix(p, "/")
	segs := strings.Split(p, "/")
	for i, s := range segs {
		segs[i] = url.PathEscape(s)
	}
	return strings.Join(segs, "/")
}

func formatByteData(b []byte) string {
	var v any
	if json.Unmarshal(b, &v) == nil {
		out, _ := json.MarshalIndent(v, "", "  ")
		return string(out)
	}
	return string(b)
}

func (c *Config) vlogf(format string, a ...any) {
	if c.Verbose {
		fmt.Fprintf(os.Stderr, format, a...)
	}
}

func (c *Config) prepareRequestBody(data any, uploadFile string, headers map[string]string) (io.Reader, error) {
	if uploadFile != "" {
		return c.prepareUploadBody(uploadFile, headers)
	}
	if data != nil {
		return c.prepareJSONBody(data, headers)
	}
	return nil, nil
}

func (c *Config) prepareUploadBody(uploadFile string, headers map[string]string) (io.Reader, error) {
	if uploadFile == "-" {
		return os.Stdin, nil
	}

	f, err := os.Open(uploadFile)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", uploadFile, err)
	}
	// Note: caller must close the file
	if st, err := f.Stat(); err == nil {
		headers["X-File-Timestamp"] = strconv.FormatInt(st.ModTime().Unix(), 10)
	}
	return f, nil
}

func (c *Config) prepareJSONBody(data any, headers map[string]string) (io.Reader, error) {
	raw, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("marshal json: %w", err)
	}
	headers["Content-Type"] = "application/json"
	return bytes.NewReader(raw), nil
}

func (c *Config) createRequest(ctx context.Context, method, requestURL string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, requestURL, body)
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}

	authHeaders, err := c.GetAuthHeaders()
	if err != nil {
		return nil, err
	}

	for k, v := range authHeaders {
		req.Header.Set(k, v)
	}
	return req, nil
}

func (c *Config) logRequest(req *http.Request) {
	if !c.Verbose {
		return
	}
	c.vlogf("=> %s %s\n", req.Method, req.URL.String())
	for k, vs := range req.Header {
		for _, v := range vs {
			c.vlogf("   %s: %s\n", k, v)
		}
	}
}

func (c *Config) handleResponse(resp *http.Response) ([]byte, error) {
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		eb, _ := io.ReadAll(resp.Body)
		return nil, &HTTPError{
			StatusCode: resp.StatusCode,
			Message:    formatByteData(eb),
		}
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	return b, nil
}

func (c *Config) writeOutput(data []byte, outputFile string, resp *http.Response) error {
	if outputFile == "" {
		fmt.Print(formatByteData(data))
		return nil
	}

	if outputFile == "-" {
		_, err := os.Stdout.Write(data)
		return err
	}

	// Ensure parent directory exists
	if d := filepath.Dir(outputFile); d != "" && d != "." {
		if err := os.MkdirAll(d, DefaultDirMode); err != nil {
			return fmt.Errorf("create directory %s: %w", d, err)
		}
	}

	if err := os.WriteFile(outputFile, data, DefaultFileMode); err != nil {
		return fmt.Errorf("write %s: %w", outputFile, err)
	}

	// Set file timestamp if provided
	if lm := resp.Header.Get("Last-Modified"); lm != "" {
		if t, err := time.Parse(time.RFC1123, lm); err == nil {
			_ = os.Chtimes(outputFile, t, t)
		}
	}
	return nil
}

func (c *Config) makeHTTPRequest(method, requestURL string, data any, headers map[string]string, outputFile string, uploadFile string) error {
	ctx, cancel := context.WithTimeout(context.Background(), DefaultTimeout)
	defer cancel()

	if headers == nil {
		headers = make(map[string]string)
	}

	body, err := c.prepareRequestBody(data, uploadFile, headers)
	if err != nil {
		return err
	}

	// Close file if it was opened for upload
	if uploadFile != "" && uploadFile != "-" {
		if closer, ok := body.(io.Closer); ok {
			defer closer.Close()
		}
	}

	req, err := c.createRequest(ctx, method, requestURL, body)
	if err != nil {
		return err
	}

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	c.logRequest(req)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}

	responseData, err := c.handleResponse(resp)
	if err != nil {
		return err
	}

	return c.writeOutput(responseData, outputFile, resp)
}

// Commands
func (c *Config) cmdLs(path string, all, effective, longf, timef, recursive, json bool) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}
	gfarmPath := encodePath(path)
	params := url.Values{}
	if all {
		params.Set("show_hidden", "on")
	}
	if effective {
		params.Set("effperm", "on")
	}
	if longf {
		params.Set("long_format", "on")
	}
	if timef {
		params.Set("time_format", "full")
	} else {
		params.Set("time_format", "short")
	}
	if recursive {
		params.Set("recursive", "on")
	}
	if json {
		params.Set("output_format", "json")
	} else {
		params.Set("output_format", "plain")
	}
	u := fmt.Sprintf("%s/dir/%s", c.BaseURL, gfarmPath)
	if len(params) > 0 {
		u += "?" + params.Encode()
	}
	return c.makeHTTPRequest("GET", u, nil, nil, "", "")
}

func (c *Config) cmdDownload(gfarmPath, localPath string) error {
	if gfarmPath == "" || localPath == "" {
		return fmt.Errorf("both Gfarm-path and Local-path are required")
	}
	p := encodePath(gfarmPath)
	u := fmt.Sprintf("%s/file/%s", c.BaseURL, p)
	return c.makeHTTPRequest("GET", u, nil, nil, localPath, "")
}

func (c *Config) cmdUpload(localPath, gfarmPath string) error {
	if localPath == "" || gfarmPath == "" {
		return fmt.Errorf("both Local-path and Gfarm-path are required")
	}
	p := encodePath(gfarmPath)
	u := fmt.Sprintf("%s/file/%s", c.BaseURL, p)
	return c.makeHTTPRequest("PUT", u, nil, nil, "", localPath)
}

func (c *Config) cmdMkdir(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}
	p := encodePath(path)
	u := fmt.Sprintf("%s/dir/%s", c.BaseURL, p)
	return c.makeHTTPRequest("PUT", u, nil, nil, "", "")
}

func (c *Config) cmdRm(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}
	p := encodePath(path)
	u := fmt.Sprintf("%s/file/%s", c.BaseURL, p)
	return c.makeHTTPRequest("DELETE", u, nil, nil, "", "")
}

func (c *Config) cmdRmdir(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}
	p := encodePath(path)
	u := fmt.Sprintf("%s/dir/%s", c.BaseURL, p)
	return c.makeHTTPRequest("DELETE", u, nil, nil, "", "")
}

func (c *Config) cmdChmod(mode, path string) error {
	if mode == "" || path == "" {
		return fmt.Errorf("both mode and Gfarm-path are required")
	}
	p := encodePath(path)
	u := fmt.Sprintf("%s/attr/%s", c.BaseURL, p)
	data := map[string]string{"Mode": mode}
	return c.makeHTTPRequest("POST", u, data, nil, "", "")
}

func (c *Config) cmdStat(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}
	p := encodePath(path)
	u := fmt.Sprintf("%s/attr/%s", c.BaseURL, p)
	return c.makeHTTPRequest("GET", u, nil, nil, "", "")
}

func (c *Config) cmdMv(srcPath, dstPath string) error {
	if srcPath == "" || dstPath == "" {
		return fmt.Errorf("both source and destination paths are required")
	}
	p := encodePath(srcPath)
	u := fmt.Sprintf("%s/file/%s", c.BaseURL, p)
	data := map[string]string{"Destination": dstPath}
	return c.makeHTTPRequest("PATCH", u, data, nil, "", "")
}

func (c *Config) cmdWhoami() error {
	u := fmt.Sprintf("%s/conf/me", c.BaseURL)
	return c.makeHTTPRequest("GET", u, nil, nil, "", "")
}

// ---- CLI  ----

type Command struct {
	Name        string
	Description string
	Handler     func(*Config, []string) error
}

var commands = map[string]*Command{
	"ls": {
		Name:        "ls",
		Description: "List directory",
		Handler:     handleLs,
	},
	"download": {
		Name:        "download",
		Description: "Download file",
		Handler:     handleDownload,
	},
	"upload": {
		Name:        "upload",
		Description: "Upload file",
		Handler:     handleUpload,
	},
	"mkdir": {
		Name:        "mkdir",
		Description: "Create directory",
		Handler:     handleMkdir,
	},
	"rm": {
		Name:        "rm",
		Description: "Remove file",
		Handler:     handleRm,
	},
	"rmdir": {
		Name:        "rmdir",
		Description: "Remove directory",
		Handler:     handleRmdir,
	},
	"chmod": {
		Name:        "chmod",
		Description: "Change permissions",
		Handler:     handleChmod,
	},
	"stat": {
		Name:        "stat",
		Description: "File status",
		Handler:     handleStat,
	},
	"mv": {
		Name:        "mv",
		Description: "Move/rename",
		Handler:     handleMv,
	},
	"whoami": {
		Name:        "whoami",
		Description: "Show current user",
		Handler:     handleWhoami,
	},
}

func handleLs(cfg *Config, args []string) error {
	fs := flag.NewFlagSet("ls", flag.ExitOnError)
	all := fs.Bool("a", false, "do not hide entries starting with '.'")
	eff := fs.Bool("e", false, "display effective permissions")
	longf := fs.Bool("l", false, "list in long format")
	timef := fs.Bool("T", false, "With the -l option, show complete date format")
	rec := fs.Bool("R", false, "recursively list subdirectories")
	json := fs.Bool("j", false, "output with json format")

	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("ls requires exactly 1 Gfarm-path")
	}
	return cfg.cmdLs(rest[0], *all, *eff, *longf, *timef, *rec, *json)
}

func handleDownload(cfg *Config, args []string) error {
	fs := flag.NewFlagSet("download", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("download requires Gfarm-path and Local-path")
	}
	return cfg.cmdDownload(rest[0], rest[1])
}

func handleUpload(cfg *Config, args []string) error {
	fs := flag.NewFlagSet("upload", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("upload requires Local-path and Gfarm-path")
	}
	return cfg.cmdUpload(rest[0], rest[1])
}

func handleMkdir(cfg *Config, args []string) error {
	fs := flag.NewFlagSet("mkdir", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("mkdir requires exactly 1 Gfarm-path")
	}
	return cfg.cmdMkdir(rest[0])
}

func handleRm(cfg *Config, args []string) error {
	fs := flag.NewFlagSet("rm", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("rm requires exactly 1 Gfarm-path")
	}
	return cfg.cmdRm(rest[0])
}

func handleRmdir(cfg *Config, args []string) error {
	fs := flag.NewFlagSet("rmdir", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("rmdir requires exactly 1 Gfarm-path")
	}
	return cfg.cmdRmdir(rest[0])
}

func handleChmod(cfg *Config, args []string) error {
	fs := flag.NewFlagSet("chmod", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("chmod requires mode(octal) and Gfarm-path")
	}
	return cfg.cmdChmod(rest[0], rest[1])
}

func handleStat(cfg *Config, args []string) error {
	fs := flag.NewFlagSet("stat", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("stat requires exactly 1 Gfarm-path")
	}
	return cfg.cmdStat(rest[0])
}

func handleMv(cfg *Config, args []string) error {
	fs := flag.NewFlagSet("mv", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("mv requires source and destination")
	}
	return cfg.cmdMv(rest[0], rest[1])
}

func handleWhoami(cfg *Config, args []string) error {
	fs := flag.NewFlagSet("whoami", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	if len(fs.Args()) != 0 {
		return fmt.Errorf("whoami takes no arguments")
	}
	return cfg.cmdWhoami()
}

func exitErr(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func showRootHelp() {
	fmt.Printf(`Usage: %s [global-options] <command> [command-options] [args]

Global options:
  -k, --insecure    Insecure TLS (skip verify)
  -v, --verbose     Verbose logging
  -h, --help        Show this help

Commands:
`, os.Args[0])
	for _, cmd := range commands {
		fmt.Printf("  %-8s  %s\n", cmd.Name, cmd.Description)
	}
}

func parseGlobal() (insecure, verbose bool, rest []string) {
	insecure = false
	verbose = false

	args := os.Args[1:]
	for len(args) > 0 {
		a := args[0]
		if !strings.HasPrefix(a, "-") {
			break
		}
		switch a {
		case "-k", "--insecure":
			insecure = true
		case "-v", "--verbose":
			verbose = true
		case "-h", "--help":
			showRootHelp()
			os.Exit(0)
		default:
			fmt.Fprintf(os.Stderr, "Unknown global option: %s\n", a)
			os.Exit(1)
		}
		args = args[1:]
	}
	return insecure, verbose, args
}

func mustBaseURL() string {
	u := os.Getenv("GFARM_HTTP_URL")
	if u == "" {
		fmt.Fprintln(os.Stderr, "Error: GFARM_HTTP_URL is required")
		os.Exit(1)
	}
	return strings.TrimSuffix(u, "/")
}

func main() {
	insecure, verbose, rest := parseGlobal()
	if len(rest) == 0 {
		showRootHelp()
		os.Exit(1)
	}
	command := rest[0]
	args := rest[1:]

	cfg := &Config{
		BaseURL:  mustBaseURL(),
		Verbose:  verbose,
		Insecure: insecure,
	}
	tr := &http.Transport{}
	if cfg.Insecure {
		tr.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} //nolint:gosec
	}
	cfg.HTTPClient = &http.Client{Transport: tr}

	cmd, exists := commands[command]
	if !exists {
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", command)
		showRootHelp()
		os.Exit(1)
	}

	exitErr(cmd.Handler(cfg, args))
}
