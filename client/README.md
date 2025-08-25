# gfarm-http Client

Command-line tools for interacting with [gfarm-http-gateway](../server).

This directory provides:

- **gfarm-http** 
  - Unified CLI for Gfarm over HTTP
- **jwt-curl**
  - Wrapper for `curl` with JWT/OIDC support

## Prerequisites

To use the client, you need:

### Infrastructure (must be running)

- **gfarm-http-gateway**
  - [server](../server) 
- **JWT server**
  - issues access tokens ([jwt-server](https://github.com/oss-tsukuba/jwt-server))  

### Client Tools (install locally)

- **jwt-agent**
  - manages and refreshes tokens ([jwt-agent](https://github.com/oss-tsukuba/jwt-agent))  


## Installation

### Build from source

You need **Go 1.18+** installed.

```bash
git clone https://github.com/oss-tsukuba/gfarm-http-gateway.git
cd gfarm-http-gateway/client

# gfarm-http
go build -o gfarm-http ./cmd/gfarm-http
sudo mv gfarm-http /usr/local/bin/
gfarm-http --help

# jwt-curl
sudo cp jwt-curl /usr/local/bin/
sudo cp jwt-curl-upload /usr/local/bin/
```

## gfarm-http

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
* `ln <target> <linkname>`
* `tar <create|extract|list> ...`

### Examples

#### Setup

```bash
# (Option A) Using OIDC Access Token
# Start jwt-agent after retrieving passphrase from JWT Server
export GFARM_HTTP_URL=http://localhost:8000

# (Option B) Using SASL Username/Password
export GFARM_HTTP_URL=http://localhost:8000
export GFARM_SASL_USER=user1
export GFARM_SASL_PASSWORD=PASSWORD
```

#### File Operations

```bash
# List files and directories
gfarm-http ls -la /tmp

# Upload and download files
gfarm-http upload ./local.txt /tmp/remote.txt
gfarm-http download /tmp/remote.txt ./local.txt

# File management
gfarm-http mkdir /tmp/newdir
gfarm-http mv /tmp/old.txt /tmp/new.txt
gfarm-http rm /tmp/unwanted.txt
```

#### System Information

```bash
# Check current user
gfarm-http whoami

# Get file attributes
gfarm-http stat /tmp/file.txt

# Change permissions
gfarm-http chmod 644 /tmp/file.txt
```

### Debug Mode

Enable verbose output for troubleshooting:

```bash
# Add -v flag for verbose output
gfarm-http -v ls /tmp
```

## jwt-curl

Wrapper around `curl` that automatically attaches an access token from `jwt-agent`.

### Commands

* `jwt-curl [curl options]`

  * Adds `Authorization: Bearer <token>` header automatically
  * Environment variables:

    * `JWT_USER_PATH` — Path to JWT file
    * `GFARM_SASL_USER` — Username (`anonymous` disables Authorization header)
    * `GFARM_SASL_PASSWORD` — Password (for SASL PLAIN/LOGIN)
* `jwt-curl-upload local_file URL [curl options]`

  * Convenience wrapper for file uploads

### Examples

#### Basic Requests

```bash
# Get username
jwt-curl -s http://localhost:8000/conf/me

# Get file list
jwt-curl -s "http://localhost:8000/dir/?show_hidden=on&long_format=on"
```

#### File Transfer

```bash
# Upload large file
jwt-curl-upload /tmp/10GiB http://localhost:8000/file/tmp/10GiB

# Download file
jwt-curl -o /tmp/10GiB-2 http://localhost:8000/file/tmp/10GiB
```

#### Authentication Variants

```bash
# Anonymous access
GFARM_SASL_USER=anonymous jwt-curl http://localhost:8000/conf/me

# SASL user/pass
GFARM_SASL_USER=user1 GFARM_SASL_PASSWORD=PASSWORD jwt-curl http://localhost:8000/conf/me
```

