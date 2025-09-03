#!/bin/bash
set -eu

DIR=$(realpath $(dirname $0))
source "${DIR}/gfarm-http-gateway-common.sh"

RELOAD=--reload
LOGLEVEL="--log-level debug"
OPT_HOST="--host 0.0.0.0"

cd "$SRC_DIR"
# PYTHONPATH="$API_DIR" exec "$UVICORN" "$APP" --proxy-headers $LOGLEVEL $OPT_HOST $RELOAD --root-path "$ROOT_NAME" "$@"

PYTHONPATH="$API_DIR" exec "$GUNICORN" -k api.workers.ConfigurableWorker \
  -w 4 -b 0.0.0.0:8000 gfarm_http_gateway:app