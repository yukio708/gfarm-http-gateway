#!/bin/bash
set -eu
set -x
DIR=$(dirname $(realpath $0))
CONF=./gfarm-http-for-docker-dist.conf

LOAD_FROM_ENV=1

if [ $LOAD_FROM_ENV -eq 1 ]; then
    source $CONF
    # get keys
    for line in $(grep -v '^\s*#' $CONF); do
        key=$(echo "$line" | cut -d '=' -f 1)
        eval "export $key"
    done
else
    GFARM_HTTP_CONFIG_FILE=$CONF
    export GFARM_HTTP_CONFIG_FILE
fi

exec ${DIR}/start-dev.sh
