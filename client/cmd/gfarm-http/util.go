package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"os"
	"strconv"
	"strings"
)

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

func mustBaseURL() string {
	u := os.Getenv("GFARM_HTTP_URL")
	if u == "" {
		fmt.Fprintln(os.Stderr, "Error: GFARM_HTTP_URL is required")
		os.Exit(1)
	}
	return strings.TrimSuffix(u, "/")
}

func expandCombinedShort(args []string, allowed string) []string {
	out := make([]string, 0, len(args))
	for _, a := range args {
		if len(a) > 2 && strings.HasPrefix(a, "-") && !strings.HasPrefix(a, "--") {
			ok := true
			for _, r := range a[1:] {
				if !strings.ContainsRune(allowed, r) {
					ok = false
					break
				}
			}
			if ok {
				for _, r := range a[1:] {
					out = append(out, "-"+string(r))
				}
				continue
			}
		}
		out = append(out, a)
	}
	return out
}

func prepareRequestBody(data any, uploadFile string, headers map[string]string) (io.Reader, func(), error) {
	if uploadFile != "" {
		return prepareUploadBody(uploadFile, headers)
	}
	if data != nil {
		return prepareJSONBody(data, headers)
	}
	return nil, func() {}, nil
}

func prepareUploadBody(uploadFile string, headers map[string]string) (io.Reader, func(), error) {
	if uploadFile == "-" {
		return os.Stdin, func() {}, nil
	}

	f, err := os.Open(uploadFile)
	if err != nil {
		return nil, func() {}, fmt.Errorf("open %s: %w", uploadFile, err)
	}
	if st, err := f.Stat(); err == nil {
		headers["X-File-Timestamp"] = strconv.FormatInt(st.ModTime().Unix(), 10)
	}
	return f, func() { _ = f.Close() }, nil
}

func prepareJSONBody(data any, headers map[string]string) (io.Reader, func(), error) {
	raw, err := json.Marshal(data)
	if err != nil {
		return nil, func() {}, fmt.Errorf("marshal json: %w", err)
	}
	headers["Content-Type"] = "application/json"
	return bytes.NewReader(raw), func() {}, nil
}
