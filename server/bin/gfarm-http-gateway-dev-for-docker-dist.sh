#!/bin/bash
set -eu
set -x

DIR=$(dirname $(realpath $0))

LOAD_FROM_ENV=1

Load_Env () {
    local CONF="$1"
    [ -f "$CONF" ] || { echo "Config not found: $CONF" >&2; return 1; }

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
}

Load_Env ./gfarm-http-gateway.conf.default 
Load_Env ./gfarm-http-gateway-for-docker-dist.conf

exec bash -x ${DIR}/gfarm-http-gateway-dev.sh "$@"
