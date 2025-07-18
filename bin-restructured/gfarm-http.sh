#!/bin/bash
# gfarm-http - HTTP gateway for Gfarm filesystem

set -eu

# Get script directory and source common configuration
DIR=$(realpath $(dirname $0))
SRC_DIR="$(realpath ${DIR}/..)"
API_DIR="${SRC_DIR}/api"
VENV_DIR="${SRC_DIR}/venv"
BIN_DIR="${VENV_DIR}/bin"
UVICORN="${BIN_DIR}/uvicorn"
PYTHON3="${BIN_DIR}/python3"
APP="gfarm_http:app"

# Default values
HOST="0.0.0.0"
PORT="8000"
WORKERS=""
PROXY_HEADERS=""
RELOAD=""
LOG_LEVEL="info"

# Help function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

HTTP gateway for Gfarm filesystem

Options:
  --host HOST         Host to bind to (default: 0.0.0.0)
  --port PORT         Port to bind to (default: 8000)
  --workers N         Number of worker processes
  --proxy-headers     Enable proxy headers
  --reload            Enable auto-reload
  --log-level LEVEL   Log level (default: info)
  -h, --help          Show this help message

Additional uvicorn options can be passed through.
EOF
}

# Parse command line arguments
ARGS=()
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            HOST="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --workers)
            WORKERS="$2"
            shift 2
            ;;
        --proxy-headers)
            PROXY_HEADERS="--proxy-headers"
            shift
            ;;
        --reload)
            RELOAD="--reload"
            shift
            ;;
        --log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            # Pass through unknown arguments
            ARGS+=("$1")
            shift
            ;;
    esac
done

# Check if uvicorn exists
if [ ! -x "$UVICORN" ]; then
    echo "Error: uvicorn not found at $UVICORN" >&2
    echo "Please ensure the virtual environment is set up correctly." >&2
    exit 1
fi

# Build uvicorn command
CMD=("$UVICORN" "$APP" "--host" "$HOST" "--port" "$PORT" "--log-level" "$LOG_LEVEL")

# Add optional arguments
if [ -n "$WORKERS" ]; then
    CMD+=("--workers" "$WORKERS")
fi

if [ -n "$PROXY_HEADERS" ]; then
    CMD+=("$PROXY_HEADERS")
fi

if [ -n "$RELOAD" ]; then
    CMD+=("$RELOAD")
fi

# Add any pass-through arguments
CMD+=("${ARGS[@]}")

# Change to source directory and execute
cd "$SRC_DIR"
PYTHONPATH="$API_DIR" exec "${CMD[@]}"