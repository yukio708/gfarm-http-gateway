#!/bin/bash
set -eu

DIR=$(realpath $(dirname $0))
source "${DIR}/gfarm-http-gateway-common.sh"

#WORKERS="--workers $(nproc)"

cd "$SRC_DIR"
# PYTHONPATH="$API_DIR" exec "$UVICORN" "$APP" --proxy-headers "$@"
PYTHONPATH="$API_DIR" exec gunicorn -k api.workers.ConfigurableWorker \
  -w 4 -b 0.0.0.0:8000 gfarm_http_gateway:app