## How to use clients

### Requirements

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


### Authorization

- How to use OIDC access token
  - HTTP request header: "Authorization: Bearer <Access token>"
- How to use username:password
  - HTTP request header: "Authorization: Basic <base64encoded 'user:pass'>"
- How to use session
  - open "/" (index page) by web browser
  - and login (OpenID provider or password for SASL)