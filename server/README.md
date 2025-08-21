# Setup gfarm-http-gateway

## Prerequisites

To run gfarm-http-gateway, you need:
- **Gfarm server** with SASL XOAUTH2 enabled  
  - See: <http://oss-tsukuba.org/gfarm/share/doc/gfarm/html/en/user/auth-sasl.html>  
- **OpenID Connect provider** (e.g., Keycloak) with client ID, secret, and valid redirect URIs  

## Configuration variables

Default values are defined in [`gfarm-http-gateway.conf.default`](./gfarm-http-gateway.conf.default).  
To customize settings, copy the provided example file:

```bash
cp gfarm-http-gateway.conf.default gfarm-http-gateway.conf
```

Edit gfarm-http-gateway.conf and update variables for your environment  
- At minimum, you must set the variables marked as **required** in `gfarm-http-gateway.conf.default`


## Quick Start (example using Docker)

### Requirements
- Docker

### Option 1: Run with Docker

#### 1. Build the Docker Image

Clone the repository and build the image:  
```bash
git clone https://github.com/oss-tsukuba/gfarm-http-gateway.git
cd gfarm-http-gateway

docker build -t gfarm-http-gateway .
```

#### 2. Prepare Configuration

Create a `config/` directory in your current working directory with the following files:  
```
config/
├── gfarm2.conf              # Gfarm client configuration (required)
├── gfarm-http-gateway.conf  # Gateway configuration (required)
├── certs/                   # Gfarm CA certificates (required)
└── dev_ca.crt               # (Optional) Custom CA certificate (for development)
```

In `gfarm2.conf`, you need to set `auth enable sasl` (or `sasl_auth`)

#### 3. Run the Container

```bash
docker run --rm \
  -v $(pwd)/config:/config \
  -p 8000:8000 \
  gfarm-http-gateway
```

By default, **gfarm-http-gateway** listens on port 8000 inside the container.  
To use a different port, pass `--port` to the container command and adjust the `-p` mapping:  
```bash
docker run --rm \
  -v $(pwd)/config:/config \
  -p 8080:8080 \
  gfarm-http-gateway --port 8080
```

### Option 2: Run Behind Nginx (HTTPS)

Use Nginx as a reverse proxy in front of **gfarm-http-gateway**.  
This example uses Docker Compose.  

#### 1. Prepare the Configuration

See **Option 1 → 2. Prepare Configuration** for the required `config/` files.  

Copy the provided sample files:  
```bash
cp docker-compose.yaml.sample docker-compose.yaml
mkdir nginx
cp nginx.conf.sample ./nginx/gfarm.conf
```

Edit them to match your environment:  
- In **`docker-compose.yaml`**:
  - Mount the Nginx config and (optionally) certs, e.g.:
    - `./nginx/gfarm.conf:/etc/nginx/conf.d/gfarm.conf:ro`
    - `./nginx/certs:/etc/nginx/certs:ro`
- In **`nginx/gfarm.conf`**:
  - Point TLS to your cert paths, e.g.:
    - `ssl_certificate     /etc/nginx/certs/cert.pem;`
    - `ssl_certificate_key /etc/nginx/certs/key.pem;`

#### 2. Launch with Docker Compose

```bash
docker compose up -d
```

### Option 3: Run Under a Subpath

Serve the gateway under a URL prefix (e.g., `/gfarm/`).  
This is useful when you share a domain with other apps behind the same reverse proxy.

#### 1. Start the gateway with a root path

- **Docker (single container):**

```bash
  docker run --rm \
    -v $(pwd)/config:/config \
    -p 8000:8000 \
    gfarm-http-gateway --host 0.0.0.0 --port 8000 --root-path /gfarm
```

- **Docker Compose:** update the command for the gateway service:

  ```yaml
  services:
    gfarm-http-gateway:
      command: --host 0.0.0.0 --port 8000 --root-path /gfarm
  ```

> `--root-path /gfarm` tells Uvicorn/FastAPI that the app lives under `/gfarm`.

If you use Nginx as a reverse proxy, add a `location /gfarm/` block that preserves `/gfarm` when forwarding:  
```
...
  location /gfarm/ {
    ...
}
```

### Option 4: Run in HPCI environment

For running `gfarm-http-gateway` in the HPCI environment, an example Compose file is provided:  
[`docker-compose-for-HPCI.yaml`](./docker-compose-for-HPCI.yaml)

Build and Run:
```bash
docker compose -f docker-compose-for-HPCI.yaml up -d --build
```

This setup:
- Uses `Dockerfile-for-HPCI`
  - Automatically downloads HPCI-specific configuration (`gfarm2.conf`) and certificates
- Mounts `gfarm-http-gateway-for-HPCI.conf` as the gateway configuration
- Runs on port 8080 (accessible at `http://localhost:8080`)


## Manual Installation (example without Docker)

### Requirements

- Gfarm (clients) 2.8.7 or later
- Python 3.12 or later
- venv (python3-venv)
- Python packages (refer to `requirements.txt`)
- GNU Make
- curl 7.76.0 or later (for gfhttpc-* commands)
- Node.js v22 or later

#### Setup environment

- **Gfarm server environment**
  - in `$(pkg-config --variable=libdir libsasl2)/sasl2/gfarm.conf` of servers
    - `mech_list: XOAUTH2`
  - SEE ALSO: <http://oss-tsukuba.org/gfarm/share/doc/gfarm/html/en/user/auth-sasl.html>
- **Gfarm client environment**
  - gf* commands and gfarm2.conf is required
  - in `~/.gfarm2rc` (or `<prefix>/etc/gfarm2.conf`) of clients
    - `auth enable sasl` (or `sasl_auth`)
    - `auth disable <all other methods>`
    - DO NOT set `sasl_mechanisms <...>`
    - DO NOT set `sasl_user <...>`
- **gfarm-http-gateway requirements**
  - (For Ubuntu 24.04 or RHEL(8,9) family)
    - Run `make setup`
  - (For other environments)
    - Refer to `setup.sh` and install the listed packages manually.
  - (When using Pyenv python3 instead of system python3)
    - install and setup Pyenv: <https://github.com/pyenv/pyenv>
    - (ex.) `pyenv install -v 3.12`
    - `cd gfarm-http-gateway`
    - `make clear-venv`
    - (ex.) `pyenv local 3.12`
    - `make setup-wo-sys-packages` or `setup-latest-wo-sys-packages`
- **OpenID Connect provider**
  - client ID and client secret
  - valid redirect URI
  - logout redirect URI (optional)

### Start server

#### Start for clients on localhost (127.0.0.1)

- `./bin/gfarm-http-gateway.sh`
- For production use, it is recommended to use this with a reverse proxy.

#### Start for clients of any hosts

- (not for production use)
- `./bin/gfarm-http-gateway.sh --host 0.0.0.0 --port 8000`

#### Start for developer

- (install GNU make)
- `make test` to run test
- `./bin/gfarm-http-gateway-dev.sh --port 8000 --log-level debug`
  - for clients of any hosts (0.0.0.0:8000)
  - high load average

### Systemd

- Copy this gfarm-http-gateway (source tree) to any directory
  - Ex.: /opt/gfarm-http-gateway
- `sudo cp gfarm-http.service /etc/systemd/system/`
  - `gfarm-http.service` is an example file
- Edit `/etc/systemd/system/gfarm-http.service` for your environment
- `sudo systemctl daemon-reload`
- `sudo systemctl enable gfarm-http`
- `sudo systemctl start gfarm-http`
- `sudo systemctl status gfarm-http`

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


## API Documentation

- Swagger (auto-generated by FastAPI)
  - <http://(hostname:port)/docs>

## Development

### Development environment in gfarm/docker/dist

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
- Refer to `Example: Keycloak on Gfarm docker/dist (developer setup)` for configuration details
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

#### Example: Keycloak on Gfarm docker/dist (developer setup)

This section shows how to configure **Keycloak** as an OpenID Connect provider in the
[Gfarm docker/dist](https://github.com/oss-tsukuba/gfarm/tree/master/docker/dist) environment.  
It is intended as a development example only.

1. Open the Keycloak admin console in a web browser:  
   - `https://keycloak:8443/auth/admin/master/console/#/HPCI/`  
   - Login with `admin/admin`

2. In the **HPCI** realm, an example client `hpci-pub` is already created.  
   Edit it and configure:
   - **Valid redirect URIs** → add entries such as:
     - `http://c2:8000/*`
     - `http://c2/*`
   - **Valid post logout redirect URIs** → add entries such as:
     - `http://c2:8000/*`
     - `http://c2/*`

3. Save your changes.

4. When you run `gfarm-http-gateway` in this docker/dist environment:
   - You will be redirected to Keycloak for login.  
   - Example test user: `user1 / PASSWORD`

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
