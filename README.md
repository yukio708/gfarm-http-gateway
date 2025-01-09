# gfarm-http-gateway

HTTP gateway for Gfarm

## Setup

- ./setup.sh

## Start server

### Start for clients on localhost (127.0.0.1)

- ./bin/start.sh

### Start for clients on any hosts

- ./bin/start.sh 0.0.0.0:8000

### for developer

- ./bin/start-dev.sh

## client

- bin/jwt-curl [curl options]
  - Automatically add the access token from jwt-agent to the Authorization header
  - Available curl options
    - See the curl manual
  - Use environment variable JWT_USER_PATH if it is set.
- bin/jwt-curl-upload localfile URL [curl options]
  - Upload a file
  - Automatically use jwt-curl and --upload-file option

### example

- (start start-dev.sh on c2)
- (get passphrase from jwt-server)
- (start jwt-agent)
- (gfmkdir /tmp; gfchmod 1777 /tmp)
- cd bin
- ./jwt-curl http://c2:8000/m/whoami
- ./jwt-curl http://c2:8000/m/gfmd
- ./jwt-curl http://c2:8000/m/gfsd
- ./jwt-curl "http://c2:8000/d/?a=1&R=1&ign_err=1"
- dd if=/dev/urandom of=~/10GiB bs=1M count=10K
- ./jwt-gfarm-upload ~/10GiB http://c2:8000/f/tmp/10GiB
- ./jwt-curl -o 10GiB-2 http://c2:8000/f/tmp/10GiB

## API docs

- Swagger
  - http://...:8000/docs

### TODO

```
Web UI
(initialize)
npx create-react-app ui
cd ui
npm:
  npm start
  npm install axios
yarn:
  yarn start
  yarn add axios
```
