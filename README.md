# gfarm-http-gateway

HTTP gateway for Gfarm

## Requirements

- Python 3.11 or later
- python3-venv
- (For the Python packages used, please refer to requirements.txt)

## Setup

- Refer to setup.sh
- (For Ubuntu 24.0 or RHEL8 family)
  - ./setup.sh

## Start server

### Start for clients on localhost (127.0.0.1)

- ./bin/start.sh

### Start for clients on any hosts

- ./bin/start.sh 0.0.0.0:8000

### Start for developer

- ./bin/start-dev.sh
  - for clients on any hosts (0.0.0.0:8000)

## Development environment in docker/dist

- setup Gfarm docker/dist (refer to (gfarm source)/docker/dist/README.md)
  - setup `For OAuth authentication`
  - setup `Use http proxy` (squid container)
- clone(git clone) gfarm-http-gateway repository to (gfarm source)/gfarm-http-gateway
- `make`
  - login to c1 container
- `ssh c2`
- `cd ~/gfarm/gfarm-http-gateway`
- `./setup.sh`
- `bin/start-dev.sh`
- use the http proxy (squid) for c2, c3, keycloak and jwt-server for a web browser
- open `http://c2:8000/` in a web browser
    - redirect to keycloak
    - login user1/PASSWORD
  - The page is an example of API Usage

## curl client

- bin/jwt-curl [curl options]
  - Automatically add the access token from jwt-agent to the Authorization header
  - Available curl options
    - See the curl manual
  - Use environment variable JWT_USER_PATH if it is set.
- bin/jwt-curl-upload localfile URL [curl options]
  - Upload a file
  - Automatically use jwt-curl and --upload-file option

### Example

- start `bin/start-dev.sh`
- get passphrase from JWT Server
  - JWT Server: https://github.com/oss-tsukuba/jwt-server
- start `jwt-agent`
- `gfmkdir /tmp; gfchmod 1777 /tmp`
- `cd bin`
- `./jwt-curl -s http://c2:8000/c/me`
- `./jwt-curl -s "http://c2:8000/d/?a=1&R=1&ign_err=1"`
- `dd if=/dev/urandom of=/tmp/10GiB bs=1M count=10K`
- `./jwt-curl-upload /tmp/10GiB http://c2:8000/f/tmp/10GiB`
- `./jwt-curl -o /tmp/10GiB-2 http://c2:8000/f/tmp/10GiB`

## API docs

- Swagger
  - http://...:8000/docs
