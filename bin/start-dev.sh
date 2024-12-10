#!/bin/bash

DIR=$(realpath $(dirname $0))
source "${DIR}/common.sh"

UVICORN="${BIN_DIR}/uvicorn"

RELOAD=--reload
#LOGLEVEL=trace
LOGLEVEL=debug

PYTHONPATH="${SRC_DIR}/api" "$UVICORN" gfarm_api:app --log-level $LOGLEVEL --host 0.0.0.0 $RELOAD
