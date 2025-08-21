# gfarm-http Client

Command-line tools for interacting with [gfarm-http-gateway](../server).

This directory provides:

- **gfarm-http** — Unified CLI for Gfarm over HTTP
- **jwt-curl** — Wrapper for `curl` with JWT/OIDC support

## Prerequisites

To use the client, you need:

### Infrastructure (must be running)

- **gfarm-http-gateway** — The API server  
- **JWT server** — Issues access tokens ([jwt-server](https://github.com/oss-tsukuba/jwt-server))  

### Client Tools (install locally)

- **jwt-agent** — Manages and refreshes tokens ([jwt-agent](https://github.com/oss-tsukuba/jwt-agent))  

## Installation

### Option 1: Download prebuilt binary (recommended)

Prebuilt binaries are available from the [Releases](https://github.com/oss-tsukuba/gfarm-http-gateway/releases) page.

Example for Linux (amd64):

```bash
wget https://github.com/oss-tsukuba/gfarm-http-gateway/releases/download/vX.Y.Z/gfarm-http-linux-amd64 -O gfarm-http
chmod +x gfarm-http
sudo mv gfarm-http /usr/local/bin/
```

> Replace `vX.Y.Z` with the desired release version

Then verify:

```bash
gfarm-http --help
```


---

### Option 2: Build from source

You need **Go 1.18+** installed.

```bash
git clone https://github.com/oss-tsukuba/gfarm-http-gateway.git
cd gfarm-http-gateway/client
go build -o gfarm-http ./cmd/gfarm-http
```

The compiled binary `gfarm-http` will be created in the `client/` directory.

Install it to your PATH:

```bash
sudo mv gfarm-http /usr/local/bin/
```

Then verify:

```bash
gfarm-http --help
```


## gfarm-http (recommended CLI)

Main entry point:

```bash
gfarm-http [global-options] <command> [command-options] [args]
```

### Supported commands

* `ls [options] <Gfarm-path>`
* `download <Gfarm-path> <Local-path>`
* `upload <Local-path> <Gfarm-path>`
* `rm <Gfarm-path>`
* `mkdir <Gfarm-path>`
* `rmdir <Gfarm-path>`
* `mv <src> <dest>`
* `stat <Gfarm-path>`
* `chmod <mode> <Gfarm-path>`
* `whoami`
* `copy <src> <dest>`
* `symlink <target> <linkname>`
* `tar <create|extract|list> ...`

### Examples

#### File Operations
```bash
# List files and directories
GFARM_HTTP_URL=http://localhost:8000 gfarm-http ls -la /tmp

# Upload and download files
GFARM_HTTP_URL=http://localhost:8000 gfarm-http upload ./local.txt /tmp/remote.txt
GFARM_HTTP_URL=http://localhost:8000 gfarm-http download /tmp/remote.txt ./local.txt

# File management
GFARM_HTTP_URL=http://localhost:8000 gfarm-http mkdir /tmp/newdir
GFARM_HTTP_URL=http://localhost:8000 gfarm-http mv /tmp/old.txt /tmp/new.txt
GFARM_HTTP_URL=http://localhost:8000 gfarm-http rm /tmp/unwanted.txt
```

#### System Information
```bash
# Check current user
GFARM_HTTP_URL=http://localhost:8000 gfarm-http whoami

# Get file attributes
GFARM_HTTP_URL=http://localhost:8000 gfarm-http stat /tmp/file.txt

# Change permissions
GFARM_HTTP_URL=http://localhost:8000 gfarm-http chmod 644 /tmp/file.txt
```


## jwt-curl

Wrapper around `curl` that automatically attaches an access token from `jwt-agent`.

### Commands

* `bin/jwt-curl [curl options]`

  * Adds `Authorization: Bearer <token>` header automatically
  * Environment variables:

    * `JWT_USER_PATH` — Path to JWT file
    * `GFARM_SASL_USER` — Username (`anonymous` disables Authorization header)
    * `GFARM_SASL_PASSWORD` — Password (for SASL PLAIN/LOGIN)
* `bin/jwt-curl-upload local_file URL [curl options]`

  * Convenience wrapper for file uploads

### Examples

```bash
# Start jwt-agent after retrieving passphrase from JWT Server

# Simple GET with token
./jwt-curl -s http://c2:8000/conf/me

# Anonymous access
GFARM_SASL_USER=anonymous ./jwt-curl http://c2:8000/conf/me

# SASL user/pass
GFARM_SASL_USER=user1 GFARM_SASL_PASSWORD=PASSWORD ./jwt-curl http://c2:8000/conf/me
```

## Authorization

Supported methods:

* **OIDC Access Token** (preferred):
  `Authorization: Bearer <token>`

* **SASL Username/Password**:
  `Authorization: Basic <base64(user:pass)>`

* **Browser Session**:
  Login through the Web UI (OIDC or SASL)

## Debug Mode

Enable verbose output for troubleshooting:

```bash
# Add -v flag for verbose output
gfarm-http -v ls /tmp
```
