#!/bin/bash

DIR=$(realpath $(dirname $0))
source "${DIR}/common.sh"

LOGLEVEL=info

cd "$SRC_DIR"
PYTHONPATH="${SRC_DIR}/api" "$UVICORN" --proxy-headers --log-level $LOGLEVEL --workers $(nproc) gfarm_api:app "$@"
