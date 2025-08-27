package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strings"
)

func GetAuthHeaders() (map[string]string, error) {
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
