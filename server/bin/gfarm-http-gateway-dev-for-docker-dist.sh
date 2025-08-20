#!/bin/bash
set -eu
set -x

cp gfarm-http-gateway.conf.default gfarm-http-gateway.conf

DIR=$(dirname $(realpath $0))
CONF=./gfarm-http-gateway-for-docker-dist.conf

LOAD_FROM_ENV=1

if [ $LOAD_FROM_ENV -eq 1 ]; then
    source $CONF
    # get keys
    while IFS= read -r line; do
        if echo "$line" | grep -qv '^\s*#\|^\s*$'; then
            key=$(echo "$line" | cut -d '=' -f 1)
            eval "export $key"
        fi
    done < "$CONF"
else
    GFARM_HTTP_CONFIG_FILE="$CONF"
    export GFARM_HTTP_CONFIG_FILE
fi

exec bash -x ${DIR}/gfarm-http-gateway-dev.sh "$@"
