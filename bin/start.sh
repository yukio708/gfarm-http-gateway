#!/bin/bash

DIR=$(realpath $(dirname $0))
source "${DIR}/common.sh"

BIND_DEFAULT="127.0.0.1:8000"
BIND=${1:-${BIND_DEFAULT}}

GUNICORN="${BIN_DIR}/gunicorn"

PYTHONPATH="${SRC_DIR}/api" "$GUNICORN" --bind "$BIND" -w 4 -k uvicorn.workers.UvicornWorker gfarm_api:app
