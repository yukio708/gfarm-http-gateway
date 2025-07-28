#!/bin/bash

if [[ $# -eq 0 ]]; then
  echo "Launching gfarm-http-gateway with default options..."
  exec bash /app/gfarm-http-gateway/bin/gfarm-http.sh --host 0.0.0.0 --port 8000 --root-path /gfarm
else
  echo "Running user-specified command: $@"
  exec "$@"
fi