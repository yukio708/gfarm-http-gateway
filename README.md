# gfarm-http-gateway

HTTP gateway and CLI client for the [Gfarm distributed filesystem](https://github.com/oss-tsukuba/gfarm).

This repository provides two components:  
- **Server**: `gfarm-http-gateway/` — FastAPI application exposing an HTTP API for Gfarm  
- **Client**: `client/` — Command-line interface (CLI) for interacting with the gateway API  


## Features

- Web API for Gfarm
  - Gfarm: <https://github.com/oss-tsukuba/gfarm>
- Web UI
- Login with OpenID Connect (OIDC)
  - OpenID provider: Keycloak or etc.
- Get an Access Token from the OpenID provider
- Use the Access Token to access Gfarm filesystem
- Refresh refresh_token automatically
- (Support SASL:PLAIN and SASL:ANONYMOUS)


## Quick Links

- **Server setup (Docker or manual):**  
  [gfarm-http-gateway/README.md](./server/README.md)

- **Client usage (CLI):**  
  [client/README.md](./client/README.md)

