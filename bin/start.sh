#!/bin/bash

DIR=$(realpath $(dirname $0))
source "${DIR}/common.sh"

#--workers $(nproc)
#--log-level info

cd "$SRC_DIR"
PYTHONPATH="${SRC_DIR}/api" "$UVICORN" --proxy-headers gfarm_api:app "$@"
