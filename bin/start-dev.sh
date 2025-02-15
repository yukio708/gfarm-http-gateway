#!/bin/bash

DIR=$(realpath $(dirname $0))
source "${DIR}/common.sh"

RELOAD=--reload
#LOGLEVEL=trace
LOGLEVEL=debug

cd "$SRC_DIR"
PYTHONPATH="${SRC_DIR}/api" "$UVICORN" --proxy-headers --log-level $LOGLEVEL --host 0.0.0.0 $RELOAD gfarm_api:app "$@"
