#!/bin/bash

DIR=$(realpath $(dirname $0))
source "${DIR}/common.sh"

UVICORN="${BIN_DIR}/uvicorn"

RELOAD=--reload
PYTHONPATH="${SRC_DIR}/api" "$UVICORN" gfarm_api:app --host 0.0.0.0 $RELOAD
