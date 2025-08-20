#!/bin/bash
set -eu

DIR=$(realpath $(dirname $0))
source "${DIR}/gfarm-http-gateway-common.sh"

RELOAD=--reload
LOGLEVEL="--log-level debug"
OPT_HOST="--host 0.0.0.0"

cd "$SRC_DIR"
PYTHONPATH="$API_DIR" exec "$UVICORN" "$APP" --proxy-headers $LOGLEVEL $OPT_HOST $RELOAD "$@"
