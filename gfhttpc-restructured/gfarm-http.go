package main

import (
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds the global configuration
type Config struct {
	BaseURL    string
	Verbose    bool
	Insecure   bool
	HTTPClient *http.Client
}

// GetAuthHeaders returns authentication headers based on environment variables
func (c *Config) GetAuthHeaders() (map[string]string, error) {
	headers := make(map[string]string)

	saslUser := os.Getenv("GFARM_SASL_USER")
	saslPassword := os.Getenv("GFARM_SASL_PASSWORD")

	if saslUser == "anonymous" {
		return headers, nil
	} else if saslUser != "" && saslPassword != "" {
		auth := base64.StdEncoding.EncodeToString([]byte(saslUser + ":" + saslPassword))
		headers["Authorization"] = "Basic " + auth
		return headers, nil
	} else {
		token, err := getJWTToken()
		if err != nil {
			return nil, fmt.Errorf("error reading JWT token: %v", err)
		}
		if token != "" {
			headers["Authorization"] = "Bearer " + token
			return headers, nil
		} else {
			return nil, fmt.Errorf("environment variable JWT_USER_PATH (or GFARM_SASL_USER and GFARM_SASL_PASSWORD) is required")
		}
	}
}

// getJWTToken reads JWT token from file or environment
func getJWTToken() (string, error) {
	jwtPath := os.Getenv("JWT_USER_PATH")
	if jwtPath == "" {
		uid := os.Getuid()
		jwtPath = fmt.Sprintf("/tmp/jwt_user_u%d/token.jwt", uid)
	}

	if _, err := os.Stat(jwtPath); os.IsNotExist(err) {
		return "", nil
	}

	data, err := os.ReadFile(jwtPath)
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(string(data)), nil
}

// urlPathEncode encodes path while preserving forward slashes
func urlPathEncode(path string) string {
	path = strings.TrimPrefix(path, "/")
	return url.QueryEscape(path)
}

// makeHTTPRequest performs HTTP request with authentication
func (c *Config) makeHTTPRequest(method, requestURL string, data interface{}, headers map[string]string, outputFile string, uploadFile string) error {
	// Get authentication headers
	authHeaders, err := c.GetAuthHeaders()
	if err != nil {
		return err
	}

	// Prepare request body
	var body io.Reader
	if uploadFile != "" {
		if uploadFile == "-" {
			body = os.Stdin
		} else {
			file, err := os.Open(uploadFile)
			if err != nil {
				return fmt.Errorf("error opening file %s: %v", uploadFile, err)
			}
			defer file.Close()

			// Add file timestamp header
			if stat, err := file.Stat(); err == nil {
				mtime := stat.ModTime().Unix()
				if headers == nil {
					headers = make(map[string]string)
				}
				headers["X-File-Timestamp"] = strconv.FormatInt(mtime, 10)
			}
			body = file
		}
	} else if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return fmt.Errorf("error marshaling JSON: %v", err)
		}
		body = strings.NewReader(string(jsonData))
		if headers == nil {
			headers = make(map[string]string)
		}
		headers["Content-Type"] = "application/json"
	}

	// Create request
	req, err := http.NewRequest(method, requestURL, body)
	if err != nil {
		return fmt.Errorf("error creating request: %v", err)
	}

	// Add headers
	for key, value := range authHeaders {
		req.Header.Set(key, value)
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	if c.Verbose {
		fmt.Fprintf(os.Stderr, "Making %s request to %s\n", method, requestURL)
		for key, values := range req.Header {
			for _, value := range values {
				fmt.Fprintf(os.Stderr, "Header: %s: %s\n", key, value)
			}
		}
	}

	// Make request
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("error making request: %v", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode >= 400 {
		errorData, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("HTTP %d Error: %s", resp.StatusCode, string(errorData))
	}

	// Handle response
	responseData, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("error reading response: %v", err)
	}

	if outputFile != "" {
		if outputFile == "-" {
			os.Stdout.Write(responseData)
		} else {
			err := os.WriteFile(outputFile, responseData, 0644)
			if err != nil {
				return fmt.Errorf("error writing to file %s: %v", outputFile, err)
			}

			// Set file timestamp if available
			if lastModified := resp.Header.Get("Last-Modified"); lastModified != "" {
				if t, err := time.Parse(time.RFC1123, lastModified); err == nil {
					os.Chtimes(outputFile, t, t)
				}
			}
		}
	} else {
		fmt.Print(string(responseData))
	}

	return nil
}

// Command implementations
func (c *Config) cmdLs(path string, all, effective, long, recursive bool) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}

	gfarmPath := urlPathEncode(path)
	params := url.Values{}

	if all {
		params.Set("show_hidden", "1")
	}
	if effective {
		params.Set("effperm", "1")
	}
	if long {
		params.Set("long_format", "1")
	}
	if recursive {
		params.Set("recursive", "1")
	}

	requestURL := fmt.Sprintf("%s/dir/%s", c.BaseURL, gfarmPath)
	if len(params) > 0 {
		requestURL += "?" + params.Encode()
	}

	return c.makeHTTPRequest("GET", requestURL, nil, nil, "", "")
}

func (c *Config) cmdDownload(gfarmPath, localPath string) error {
	if gfarmPath == "" || localPath == "" {
		return fmt.Errorf("both Gfarm-path and Local-path are required")
	}

	encodedPath := urlPathEncode(gfarmPath)
	requestURL := fmt.Sprintf("%s/file/%s", c.BaseURL, encodedPath)

	return c.makeHTTPRequest("GET", requestURL, nil, nil, localPath, "")
}

func (c *Config) cmdUpload(localPath, gfarmPath string) error {
	if localPath == "" || gfarmPath == "" {
		return fmt.Errorf("both Local-path and Gfarm-path are required")
	}

	encodedPath := urlPathEncode(gfarmPath)
	requestURL := fmt.Sprintf("%s/file/%s", c.BaseURL, encodedPath)

	return c.makeHTTPRequest("PUT", requestURL, nil, nil, "", localPath)
}

func (c *Config) cmdMkdir(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}

	encodedPath := urlPathEncode(path)
	requestURL := fmt.Sprintf("%s/dir/%s", c.BaseURL, encodedPath)

	return c.makeHTTPRequest("PUT", requestURL, nil, nil, "", "")
}

func (c *Config) cmdRm(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}

	encodedPath := urlPathEncode(path)
	requestURL := fmt.Sprintf("%s/file/%s", c.BaseURL, encodedPath)

	return c.makeHTTPRequest("DELETE", requestURL, nil, nil, "", "")
}

func (c *Config) cmdRmdir(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}

	encodedPath := urlPathEncode(path)
	requestURL := fmt.Sprintf("%s/dir/%s", c.BaseURL, encodedPath)

	return c.makeHTTPRequest("DELETE", requestURL, nil, nil, "", "")
}

func (c *Config) cmdChmod(mode, path string) error {
	if mode == "" || path == "" {
		return fmt.Errorf("both mode and Gfarm-path are required")
	}

	encodedPath := urlPathEncode(path)
	requestURL := fmt.Sprintf("%s/attr/%s", c.BaseURL, encodedPath)

	data := map[string]string{"Mode": mode}
	return c.makeHTTPRequest("POST", requestURL, data, nil, "", "")
}

func (c *Config) cmdStat(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}

	encodedPath := urlPathEncode(path)
	requestURL := fmt.Sprintf("%s/attr/%s", c.BaseURL, encodedPath)

	return c.makeHTTPRequest("GET", requestURL, nil, nil, "", "")
}

func (c *Config) cmdMv(srcPath, dstPath string) error {
	if srcPath == "" || dstPath == "" {
		return fmt.Errorf("both source and destination paths are required")
	}

	encodedSrcPath := urlPathEncode(srcPath)
	requestURL := fmt.Sprintf("%s/file/%s", c.BaseURL, encodedSrcPath)

	data := map[string]string{"Destination": dstPath}
	return c.makeHTTPRequest("PATCH", requestURL, data, nil, "", "")
}

func (c *Config) cmdWhoami() error {
	requestURL := fmt.Sprintf("%s/conf/me", c.BaseURL)
	return c.makeHTTPRequest("GET", requestURL, nil, nil, "", "")
}

// Help functions
func showHelp() {
	fmt.Printf(`Usage: %s [global-options] <command> [command-options] [arguments]

Global options:
  -k, --insecure    Insecure connection
  -v, --verbose     Verbose mode
  -h, --help        Show this help message

Commands:
  ls        List directory contents
  download  Download file from Gfarm
  upload    Upload file to Gfarm
  mkdir     Create directory
  rm        Remove file
  rmdir     Remove directory
  chmod     Change file permissions
  stat      Get file status
  mv        Move/rename file
  whoami    Show current user

Environment variables:
  GFARM_HTTP_URL       the base URL of gfarm-http-gateway. (required)
  GFARM_SASL_USER      SASL username. (optional)
  GFARM_SASL_PASSWORD  SASL password. (optional)
  JWT_USER_PATH        the file of JWT or SASL password. (optional)

Use '%s <command> --help' for more information on a command.
`, os.Args[0], os.Args[0])
}

func showCommandHelp(cmd string) {
	switch cmd {
	case "ls":
		fmt.Printf("Usage: %s ls [options] Gfarm-path\nOptions:\n", os.Args[0])
		fmt.Println("  -a, --all         Do not hide entries starting with '.'")
		fmt.Println("  -e, --effective   Display effective permissions")
		fmt.Println("  -l, --long        List in long format")
		fmt.Println("  -R, --recursive   Recursively list subdirectories")
	case "download":
		fmt.Printf("Usage: %s download [options] Gfarm-path Local-path\n", os.Args[0])
	case "upload":
		fmt.Printf("Usage: %s upload [options] Local-path Gfarm-path\n", os.Args[0])
	case "mkdir":
		fmt.Printf("Usage: %s mkdir [options] Gfarm-path\n", os.Args[0])
	case "rm":
		fmt.Printf("Usage: %s rm [options] Gfarm-path\n", os.Args[0])
	case "rmdir":
		fmt.Printf("Usage: %s rmdir [options] Gfarm-path\n", os.Args[0])
	case "chmod":
		fmt.Printf("Usage: %s chmod [options] mode(octal) Gfarm-path\n", os.Args[0])
	case "stat":
		fmt.Printf("Usage: %s stat [options] Gfarm-path\n", os.Args[0])
	case "mv":
		fmt.Printf("Usage: %s mv [options] source destination\n", os.Args[0])
	case "whoami":
		fmt.Printf("Usage: %s whoami [options]\n", os.Args[0])
	default:
		fmt.Printf("Unknown command: %s\n", cmd)
		os.Exit(1)
	}
}

// Parse command line arguments manually
func parseArgs() (config *Config, command string, args []string, err error) {
	config = &Config{}
	
	if len(os.Args) < 2 {
		showHelp()
		os.Exit(1)
	}

	i := 1
	// Parse global flags
	for i < len(os.Args) {
		arg := os.Args[i]
		if !strings.HasPrefix(arg, "-") {
			break
		}
		
		switch arg {
		case "-k", "--insecure":
			config.Insecure = true
		case "-v", "--verbose":
			config.Verbose = true
		case "-h", "--help":
			showHelp()
			os.Exit(0)
		default:
			return nil, "", nil, fmt.Errorf("unknown global option: %s", arg)
		}
		i++
	}

	if i >= len(os.Args) {
		showHelp()
		os.Exit(1)
	}

	command = os.Args[i]
	args = os.Args[i+1:]

	// Check for command help
	if len(args) > 0 && (args[0] == "--help" || args[0] == "-h") {
		showCommandHelp(command)
		os.Exit(0)
	}

	return config, command, args, nil
}

// Parse command-specific flags
func parseLsFlags(args []string) (path string, all, effective, long, recursive bool, err error) {
	fs := flag.NewFlagSet("ls", flag.ContinueOnError)
	fs.BoolVar(&all, "a", false, "")
	fs.BoolVar(&all, "all", false, "")
	fs.BoolVar(&effective, "e", false, "")
	fs.BoolVar(&effective, "effective", false, "")
	fs.BoolVar(&long, "l", false, "")
	fs.BoolVar(&long, "long", false, "")
	fs.BoolVar(&recursive, "R", false, "")
	fs.BoolVar(&recursive, "recursive", false, "")
	
	err = fs.Parse(args)
	if err != nil {
		return "", false, false, false, false, err
	}
	
	remaining := fs.Args()
	if len(remaining) != 1 {
		return "", false, false, false, false, fmt.Errorf("exactly one path argument required")
	}
	
	return remaining[0], all, effective, long, recursive, nil
}

func main() {
	config, command, args, err := parseArgs()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	// Get base URL from environment
	baseURL := os.Getenv("GFARM_HTTP_URL")
	if baseURL == "" {
		fmt.Fprintf(os.Stderr, "Error: GFARM_HTTP_URL is required\n")
		os.Exit(1)
	}
	config.BaseURL = strings.TrimSuffix(baseURL, "/")

	// Create HTTP client
	transport := &http.Transport{}
	if config.Insecure {
		transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	}
	config.HTTPClient = &http.Client{Transport: transport}

	// Execute command
	switch command {
	case "ls":
		path, all, effective, long, recursive, err := parseLsFlags(args)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
		err = config.cmdLs(path, all, effective, long, recursive)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

	case "download":
		if len(args) != 2 {
			fmt.Fprintf(os.Stderr, "Error: download requires exactly 2 arguments\n")
			os.Exit(1)
		}
		err := config.cmdDownload(args[0], args[1])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

	case "upload":
		if len(args) != 2 {
			fmt.Fprintf(os.Stderr, "Error: upload requires exactly 2 arguments\n")
			os.Exit(1)
		}
		err := config.cmdUpload(args[0], args[1])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

	case "mkdir":
		if len(args) != 1 {
			fmt.Fprintf(os.Stderr, "Error: mkdir requires exactly 1 argument\n")
			os.Exit(1)
		}
		err := config.cmdMkdir(args[0])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

	case "rm":
		if len(args) != 1 {
			fmt.Fprintf(os.Stderr, "Error: rm requires exactly 1 argument\n")
			os.Exit(1)
		}
		err := config.cmdRm(args[0])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

	case "rmdir":
		if len(args) != 1 {
			fmt.Fprintf(os.Stderr, "Error: rmdir requires exactly 1 argument\n")
			os.Exit(1)
		}
		err := config.cmdRmdir(args[0])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

	case "chmod":
		if len(args) != 2 {
			fmt.Fprintf(os.Stderr, "Error: chmod requires exactly 2 arguments\n")
			os.Exit(1)
		}
		err := config.cmdChmod(args[0], args[1])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

	case "stat":
		if len(args) != 1 {
			fmt.Fprintf(os.Stderr, "Error: stat requires exactly 1 argument\n")
			os.Exit(1)
		}
		err := config.cmdStat(args[0])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

	case "mv":
		if len(args) != 2 {
			fmt.Fprintf(os.Stderr, "Error: mv requires exactly 2 arguments\n")
			os.Exit(1)
		}
		err := config.cmdMv(args[0], args[1])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

	case "whoami":
		if len(args) != 0 {
			fmt.Fprintf(os.Stderr, "Error: whoami requires no arguments\n")
			os.Exit(1)
		}
		err := config.cmdWhoami()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

	default:
		fmt.Fprintf(os.Stderr, "Error: Unknown command '%s'\n", command)
		showHelp()
		os.Exit(1)
	}
}