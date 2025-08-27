package main

import (
	"fmt"
	"os"
	"strings"
)

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
