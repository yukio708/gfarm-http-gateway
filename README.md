# gfarm-http-gateway

HTTP gateway for Gfarm filesystem

## Features

- Web API for Gfarm
  - Gfarm: <https://github.com/oss-tsukuba/gfarm>
- Web UI (Examples of API usage)
- Login with OpenID Connect (OIDC)
  - OpenID provider: Keycloak or etc.
- Get an Access Token from the OpenID provider
- Use the Access Token to access Gfarm filesystem
- Refresh refresh_token automatically
- (Support SASL:PLAIN and SASL:ANONYMOUS)

## Requirements

- Gfarm (clients) 2.8.7 or later
- Python 3.12 or later
- venv (python3-venv)
- Python packages (refer to `requirements.txt`)
- GNU Make
- OpenID provider (Keycloak, etc.)
- JWT server and jwt-agent (for gfhttpc-* and jwt-curl commands)
  - JWT Server: <https://github.com/oss-tsukuba/jwt-server>
  - jwt-agent: <https://github.com/oss-tsukuba/jwt-agent>
- curl 7.76.0 or later (for gfhttpc-* commands)
- Node.js v22 or later

## Quick Start

### Option 1: Build and Run with docker

#### 1. Build the Docker Image

Clone the repository and build the image:

```bash
git clone https://github.com/oss-tsukuba/gfarm-http-gateway.git
cd gfarm-http-gateway

docker build -t gfarm-http-gateway .
```

#### 2. Prepare Configuration

Create a config/ directory with the following files:
```
config/
├── gfarm2.conf              # Gfarm client configuration (required)
├── gfarm-http-gateway.conf  # Gateway configuration (required)
├── certs/                   # Gfarm CA certificates (required)
└── dev_ca.crt               # (Optional) Custom CA certificate (for development)
```

#### 3. Run the Container
```
docker run --rm \
  -v $(pwd)/config:/config \
  -p 8080:8080 \
  gfarm-http-gateway
```

### Option 2: Use Docker Compose

#### 1. Copy the Sample YAML

```bash
cp docker-compose.yaml.sample docker-compose.yaml
```

#### 2. Prepare the Configuration

Make sure your `config/` directory is structured like:
```
config/
├── gfarm2.conf
├── gfarm-http-gateway.conf
├── certs/
└── dev_ca.crt               # (Optional)
```

#### 3. Launch with Docker Compose

```bash
docker compose up
```

## Setup

- (install and setup Gfarm server environment)
  - in `$(pkg-config --variable=libdir libsasl2)/sasl2/gfarm.conf` of servers
    - `mech_list: XOAUTH2`
  - SEE ALSO: <http://oss-tsukuba.org/gfarm/share/doc/gfarm/html/en/user/auth-sasl.html>
- install and setup Gfarm client environment
  - gf* commands and gfarm2.conf is required
  - in `~/.gfarm2rc` (or `<prefix>/etc/gfarm2.conf`) of clients
    - `auth enable sasl` (or `sasl_auth`)
    - `auth disable <all other methods>`
    - DO NOT set `sasl_mechanisms <...>`
    - DO NOT set `sasl_user <...>`
- Refer to `setup.sh` to install requirements for gfarm-http-gateway
  - venv (python3-venv)
- (For Ubuntu 24.04 or RHEL(8,9) family)
  - Run `make setup`
- (When using Pyenv python3 instead of system python3)
  - install and setup Pyenv: <https://github.com/pyenv/pyenv>
  - (ex.) `pyenv install -v 3.12`
  - `cd gfarm-http-gateway`
  - `make clear-venv`
  - (ex.) `pyenv local 3.12`
  - `make setup-wo-sys-packages` or `setup-latest-wo-sys-packages`
- Required OpenID Connect configurations
  - client ID and client secret
  - valid redirect URI
  - logout redirect URI (optional)
  - Example of Keycloak on Gfarm docker/dist (developer environment)
    - Open Keycloak admin console in web browser
      - `https://keycloak:8443/auth/admin/master/console/#/HPCI/`
      - login: `admin/admin`
    - HPCI (realm) and hpci-pub (client ID) has already been created
    - hpci-pub ->
      - Valid redirect URIs -> Add valid redirect URIs
        - Ex.: `http://c2:8000/*`
        - Ex.: `http://c2/*`
      - Valid post logout redirect URIs -> Add valid post logout redirect URIs
        - Ex.: `http://c2:8000/*`
        - Ex.: `http://c2/*`
      - `Save` button

## Configuration variables

- Configuration file
  - Default: `<gfarm-http-gateway source>/gfarm-http.conf` is loaded if it exists
  - To specify a different file, use `GFARM_HTTP_CONFIG_FILE` environment variable
- Variables in `gfarm-http.conf`
  - GFARM_HTTP_* can be loaded
- Required variables and default variables
  - Refer to `api/default.conf`
- Default variables are overridden by `gfarm-http.conf`
- Variables from files are overridden by environment variables

## Start server

### Start for clients on localhost (127.0.0.1)

- `./bin/gfarm-http-gateway.sh`
- For production use, it is recommended to use this with a reverse proxy.

### Start for clients of any hosts

- (not for production use)
- `./bin/gfarm-http-gateway.sh --host 0.0.0.0 --port 8000`

### Start for developer

- (install GNU make)
- `make test` to run test
- `./bin/gfarm-http-gateway-dev.sh --port 8000 --log-level debug`
  - for clients of any hosts (0.0.0.0:8000)
  - high load average

## Development environment in gfarm/docker/dist

- setup gfarm/docker/dist (refer to (gfarm source)/docker/dist/README.md)
  - setup `For OAuth authentication`
  - setup `Use http proxy` (squid container)
- clone(git clone) gfarm-http-gateway repository to (gfarm source)/gfarm-http-gateway
- `make`
  - login to c1 container
- `ssh c2`
- (in c2 container)
- `cd ~/gfarm/gfarm-http-gateway`
- `make setup-latest`
- `bin/gfarm-http-gateway-dev-for-docker-dist.sh  --port 8000 --log-level debug`
- `bin/gfarm-http-gateway-dev-for-docker-dist.sh  --port 8000 --log-level debug` in c3 container using the same procedure described above
- Refer to `Setup -> Required OpenID Connect configurations` above
- use the http proxy (squid) for c2, c3, keycloak and jwt-server for a web browser
- open <https://jwt-server/> in a web browser
- copy the command line of jwt-agent and start jwt-agent in c1 container
  - input the passphrase from jwt-server
- `gfmkdir -m 1777 /tmp`
- `export GFARM_HTTP_URL=http://c2:8000`
- `make test-all` in c1 container
- open <http://c2:8000/> in a web browser
  - auto-redirect to <http://keycloak>
  - login: `user1/PASSWORD`
  - This page contains examples of API usage

## Logging

- To change log level: --log-level
  - See `venv/bin/uvicorn --help`
  - See: <https://www.uvicorn.org/settings/#logging>
- To change the log format
  - use LOGURU_FORMAT environment variable
    - cannot be specified in a configuration file
  - Ex.: `LOGURU_FORMAT="<level>{level}</level>: <level>{message}</level>"`
  - default: LOGURU_FORMAT from loguru._defaults
    - <https://github.com/Delgan/loguru/blob/master/loguru/_defaults.py>

## Systemd

- Copy this gfarm-http-gateway (source tree) to any directory
  - Ex.: /opt/gfarm-http-gateway
- `sudo cp gfarm-http.service /etc/systemd/system/`
  - `gfarm-http.service` is an example file
- Edit `/etc/systemd/system/gfarm-http.service` for your environment
- `sudo systemctl daemon-reload`
- `sudo systemctl enable gfarm-http`
- `sudo systemctl start gfarm-http`
- `sudo systemctl status gfarm-http`

## Using NGINX reverse proxy (example)

- This example uses HTTP (port 80), which is a simple protocol for transferring data between web browsers and servers without encryption.
  - For production environments, it is strongly recommended to implement SSL/TLS and use HTTPS (port 443).
  - Setting up SSL/TLS involves obtaining and configuring server certificates, as well as configuring hostname and DNS, and modifying web server settings.
  - For detailed instructions, please refer to the documentation for your web server or platform.
- (for RHEL family)
  - `sudo dnf install nginx`
- (for Ubuntu)
  - `sudo apt-get install nginx`
  - `sudo ls -l /etc/nginx/sites-enabled/default`
  - `sudo rm /etc/nginx/sites-enabled/default`
- create `/etc/nginx/conf.d/gfarm.conf`
- Example (http):

```text
server {
  listen       80;
  listen       [::]:80;
  server_name  _;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 60s;
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;

    proxy_buffering off;
    client_max_body_size 0;

    proxy_pass http://127.0.0.1:8000/;
  }}
```

- How to proxy with subpath
  - Ex.: (base URL)/gfarm/
  - `location /gfarm/ { ...`
  - use `--root-path /gfarm` option for gfarm-http-gateway.sh (uvicorn option)
- `sudo systemctl restart nginx`
- (Configure the Redirect URI parameters in Keycloak)
- Open URL of the server in web browser
  - example of docker/dist: (nginx on c2 container) <http://c2/>

## How to use clients

### gfhttpc-* commands

- bin/gfhttpc-download Gfarm-path Local-path
- bin/gfhttpc-upload Local-path Gfarm-path
- bin/gfhttpc-whoami
- bin/gfhttpc-ls [-laeR] Gfarm-path
- bin/gfhttpc-rm Gfarm-path
- bin/gfhttpc-mkdir Gfarm-path
- bin/gfhttpc-rmdir Gfarm-path
- bin/gfhttpc-mv Gfarm-path-src Gfarm-path-dest
- bin/gfhttpc-stat Gfarm-path
- bin/gfhttpc-chmod mode Gfarm-path
- bin/gfhttpc-test.sh

#### Example of gfhttpc-* commands

- `GFARM_HTTP_URL=http://c2:8000 bin/gfhttpc-whoami`
- `GFARM_HTTP_URL=http://c2:8000 GFARM_SASL_USER=user1 GFARM_SASL_PASSWORD=PASSWORD bin/gfhttpc-whoami`
- `GFARM_HTTP_URL=http://c2:8000 GFARM_SASL_USER=anonymous bin/gfhttpc-whoami`

### curl commands for jwt-agent (low level commands for gfhttpc-* commands)

- bin/jwt-curl [curl options]
  - Automatically add the access token from jwt-agent to the Authorization header
  - Available curl options
    - See the curl manual
  - Environment variables
    - JWT_USER_PATH: JWT file of access token (for SASL mechanism: XOAUTH2)
    - GFARM_SASL_USER: SASL user name
      - To use SASL ANONYMOUS: GFARM_SASL_USER=anonymous
        - In that case, the Authorization header will not be included in the request.
    - GFARM_SASL_PASSWORD: SASL password (for SASL mechanisms: PLAIN or LOGIN)
- bin/jwt-curl-upload local_file URL [curl options]
  - Upload a file
  - Automatically use jwt-curl and --upload-file option
  - Available jwt-curl environment variables

#### Example of jwt-curl command

- get passphrase from JWT Server
- start jwt-agent
- `gfmkdir /tmp; gfchmod 1777 /tmp`
- `cd bin`
- `./jwt-curl -s http://c2:8000/c/me`
- `./jwt-curl -s "http://c2:8000/d/?a=1&R=1&ign_err=1"`
- `dd if=/dev/urandom of=/tmp/10GiB bs=1M count=10K`
- `./jwt-curl-upload /tmp/10GiB http://c2:8000/f/tmp/10GiB`
- `./jwt-curl -o /tmp/10GiB-2 http://c2:8000/f/tmp/10GiB`
- `GFARM_SASL_USER=anonymous ./jwt-curl http://c2:8000/c/me`
  - or `curl http://c2:8000/c/me`
- `GFARM_SASL_USER=user1 GFARM_SASL_PASSWORD=PASSWORD ./jwt-curl http://c2:8000/c/me`

### Examples of JavaScript

- Refer to `templates/index.html` and `static/js/gfarm.js`

### Authorization

- How to use OIDC access token
  - HTTP request header: "Authorization: Bearer <Access token>"
- How to use username:password
  - HTTP request header: "Authorization: Basic <base64encoded 'user:pass'>"
- How to use session
  - open "/" (index page) by web browser
  - and login (OpenID provider or password for SASL)

## API docs

- Swagger (auto-generated by FastAPI)
  - <http://(hostname:port)/docs>

## Developer

### To freeze python packages

- Edit requirements_dev.txt
  - Ex.: `uvicorn>=0.34`
- DO NOT edit requirements.txt
- `make setup-latest-wo-sys-packages`

### To update requirements.txt for latest

```
make test
make freeze
git add requirements.txt
git commit requirements.txt
```

### GitHub Actions

- See: `.github/workflows/`
- See: <https://github.com/ad-m/github-push-action?tab=readme-ov-file#requirements-and-prerequisites>
  - (Requirements and Prerequisites)
  - `Read and write permissions` for Actions is required
- Auto `make freeze`, commit and push
- ./requirements.txt may be updated/commited/pushed automatically on GitHub, so `git pull` on your working directory may be required after `git push`
