#!/bin/bash
set -x

DIR=$(realpath $(dirname $0))
source "${DIR}/common.sh"

BIND_DEFAULT="127.0.0.1:8000"
BIND=${1:-${BIND_DEFAULT}}

GUNICORN="${BIN_DIR}/gunicorn"

CERTDIR="${HOME}/gfarm/docker/dist/minica/c2"
#HTTPS="--certfile ${CERTDIR}/cert.pem --keyfile ${CERTDIR}/key.pem"
HTTPS=""

# top directory
cd "$SRC_DIR"
PYTHONPATH="${SRC_DIR}/api" "$GUNICORN" --bind "$BIND" -w $(nproc) -k uvicorn.workers.UvicornWorker gfarm_api:app $HTTPS --access-logfile=-
