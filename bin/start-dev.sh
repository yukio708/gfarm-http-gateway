#!/bin/bash

DIR=$(realpath $(dirname $0))
source "${DIR}/common.sh"

UVICORN="${BIN_DIR}/uvicorn"

PYTHONPATH="${SRC_DIR}/api" "$UVICORN" gfarm_api:app --reload --host 0.0.0.0
