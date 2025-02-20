#!/bin/bash
set -eu

DIR=$(realpath $(dirname $0))
source "${DIR}/gfarm-http-common.sh"

#WORKERS="--workers $(nproc)"

cd "$SRC_DIR"
PYTHONPATH="$API_DIR" exec "$UVICORN" "$APP" --proxy-headers "$@"
