package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"
)

const (
	DefaultDirMode  = 0o755
	DefaultFileMode = 0o644
	DefaultTimeout  = 30 * time.Second
)

type HTTPError struct {
	StatusCode int
	Message    string
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s", e.StatusCode, e.Message)
}

type Client struct {
	BaseURL    string
	Verbose    bool
	Insecure   bool
	HTTPClient *http.Client
}

func NewClient(baseURL string, verbose, insecure bool, httpClient *http.Client) *Client {
	return &Client{
		BaseURL:    baseURL,
		Verbose:    verbose,
		Insecure:   insecure,
		HTTPClient: httpClient,
	}
}

func (c *Client) vlogf(format string, a ...any) {
	if c.Verbose {
		fmt.Fprintf(os.Stderr, format, a...)
	}
}

func (c *Client) createRequest(ctx context.Context, method, requestURL string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, requestURL, body)
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}

	authHeaders, err := GetAuthHeaders()
	if err != nil {
		return nil, err
	}

	for k, v := range authHeaders {
		req.Header.Set(k, v)
	}
	return req, nil
}

func (c *Client) logRequest(req *http.Request) {
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

func (c *Client) handleResponse(resp *http.Response, outputFile string) error {
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		eb, _ := io.ReadAll(resp.Body)
		return &HTTPError{
			StatusCode: resp.StatusCode,
			Message:    formatByteData(eb),
		}
	}

	if outputFile == "" {
		data, err := io.ReadAll(resp.Body)
		if err != nil {
			return fmt.Errorf("read response: %w", err)
		}
		fmt.Print(formatByteData(data))
		return nil
	}

	if outputFile == "-" {
		if _, err := io.Copy(os.Stdout, resp.Body); err != nil {
			return fmt.Errorf("stream write: %w", err)
		}
		return nil
	}

	if d := filepath.Dir(outputFile); d != "" && d != "." {
		if err := os.MkdirAll(d, DefaultDirMode); err != nil {
			return fmt.Errorf("create directory %s: %w", d, err)
		}
	}

	f, err := os.OpenFile(outputFile, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, DefaultFileMode)
	if err != nil {
		return fmt.Errorf("open %s: %w", outputFile, err)
	}

	defer f.Close()
	if _, err := io.Copy(f, resp.Body); err != nil {
		return fmt.Errorf("stream write: %w", err)
	}

	if lm := resp.Header.Get("Last-Modified"); lm != "" {
		if t, err := time.Parse(time.RFC1123, lm); err == nil {
			_ = os.Chtimes(outputFile, t, t)
		}
	}

	return nil
}

func (c *Client) makeHTTPRequest(method, requestURL string, data any, headers map[string]string, outputFile string, uploadFile string) error {
	ctx, cancel := context.WithTimeout(context.Background(), DefaultTimeout)
	defer cancel()

	if headers == nil {
		headers = make(map[string]string)
	}

	body, cleanup, err := prepareRequestBody(data, uploadFile, headers)
	if err != nil {
		return err
	}
	defer cleanup()

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

	err = c.handleResponse(resp, outputFile)
	if err != nil {
		return err
	}

	return nil
}

func (c *Client) cmdLs(path string, all, effective, longf, timef, recursive, json bool) error {
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

func (c *Client) cmdDownload(gfarmPath, localPath string) error {
	if gfarmPath == "" || localPath == "" {
		return fmt.Errorf("both Gfarm-path and Local-path are required")
	}
	p := encodePath(gfarmPath)
	u := fmt.Sprintf("%s/file/%s", c.BaseURL, p)
	return c.makeHTTPRequest("GET", u, nil, nil, localPath, "")
}

func (c *Client) cmdUpload(localPath, gfarmPath string) error {
	if localPath == "" || gfarmPath == "" {
		return fmt.Errorf("both Local-path and Gfarm-path are required")
	}
	p := encodePath(gfarmPath)
	u := fmt.Sprintf("%s/file/%s", c.BaseURL, p)
	return c.makeHTTPRequest("PUT", u, nil, nil, "", localPath)
}

func (c *Client) cmdMkdir(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}
	p := encodePath(path)
	u := fmt.Sprintf("%s/dir/%s", c.BaseURL, p)
	return c.makeHTTPRequest("PUT", u, nil, nil, "", "")
}

func (c *Client) cmdRm(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}
	p := encodePath(path)
	u := fmt.Sprintf("%s/file/%s", c.BaseURL, p)
	return c.makeHTTPRequest("DELETE", u, nil, nil, "", "")
}

func (c *Client) cmdRmdir(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}
	p := encodePath(path)
	u := fmt.Sprintf("%s/dir/%s", c.BaseURL, p)
	return c.makeHTTPRequest("DELETE", u, nil, nil, "", "")
}

func (c *Client) cmdChmod(mode, path string) error {
	if mode == "" || path == "" {
		return fmt.Errorf("both mode and Gfarm-path are required")
	}
	p := encodePath(path)
	u := fmt.Sprintf("%s/attr/%s", c.BaseURL, p)
	data := map[string]string{"Mode": mode}
	return c.makeHTTPRequest("POST", u, data, nil, "", "")
}

func (c *Client) cmdStat(path string) error {
	if path == "" {
		return fmt.Errorf("gfarm-path is required")
	}
	p := encodePath(path)
	u := fmt.Sprintf("%s/attr/%s", c.BaseURL, p)
	return c.makeHTTPRequest("GET", u, nil, nil, "", "")
}

func (c *Client) cmdMv(srcPath, dstPath string) error {
	if srcPath == "" || dstPath == "" {
		return fmt.Errorf("both source and destination paths are required")
	}
	p := encodePath(srcPath)
	u := fmt.Sprintf("%s/file/%s", c.BaseURL, p)
	data := map[string]string{"Destination": dstPath}
	return c.makeHTTPRequest("PATCH", u, data, nil, "", "")
}

func (c *Client) cmdWhoami() error {
	u := fmt.Sprintf("%s/conf/me", c.BaseURL)
	return c.makeHTTPRequest("GET", u, nil, nil, "", "")
}
