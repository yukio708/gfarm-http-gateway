#!/bin/bash
# gfhttpc - HTTP client for Gfarm filesystem operations

set -eu

# Get script directory and bin directory
SCRIPT_DIR=$(realpath $(dirname "$0"))
BIN_DIR="$(realpath ${SCRIPT_DIR}/../bin)"

# Common functions
ERR() {
    echo >&2 "Error:" "$@"
}

url_path_encode() {
    sed 's/^\/*//' | jq -Rr @uri | sed 's|%2F|/|g'
}

get_url_base() {
    if [ -z "${GFARM_HTTP_URL:-}" ]; then
        ERR "GFARM_HTTP_URL is required"
        exit 1
    fi
    echo "$GFARM_HTTP_URL" | sed 's/\/*$//'
}

build_curl_opts() {
    local opts=("--fail-with-body")
    
    if [ "$opt_verbose" -eq 1 ]; then
        opts+=("-v")
    else
        opts+=("--no-progress-meter")
    fi
    
    if [ "$opt_insecure" -eq 1 ]; then
        opts+=("-k")
    fi
    
    echo "${opts[@]}"
}

# Command implementations
cmd_ls() {
    local -a params=()
    local opt_all=0 opt_effective=0 opt_long=0 opt_recursive=0
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -a|--all)
                opt_all=1
                shift
                ;;
            -e|--effective)
                opt_effective=1
                shift
                ;;
            -l|--long)
                opt_long=1
                shift
                ;;
            -R|--recursive)
                opt_recursive=1
                shift
                ;;
            -*)
                ERR "Unknown option: $1"
                exit 1
                ;;
            *)
                break
                ;;
        esac
    done
    
    if [ $# -ne 1 ]; then
        ERR "Gfarm-path is required"
        exit 1
    fi
    
    local url_base=$(get_url_base)
    local gfarm_path=$(echo "$1" | url_path_encode)
    
    [ $opt_all -eq 1 ] && params+=("a=1")
    [ $opt_effective -eq 1 ] && params+=("e=1")
    [ $opt_long -eq 1 ] && params+=("l=1")
    [ $opt_recursive -eq 1 ] && params+=("R=1")
    
    local params_str=""
    if [ ${#params[@]} -gt 0 ]; then
        params_str="?"$(IFS='&'; echo "${params[*]}")
    fi
    
    local url="${url_base}/dir/${gfarm_path}${params_str}"
    local opts=($(build_curl_opts))
    
    exec "${BIN_DIR}/jwt-curl" "${opts[@]}" "$url"
}

cmd_download() {
    if [ $# -ne 2 ]; then
        ERR "Both Gfarm-path and Local-path are required"
        exit 1
    fi
    
    local url_base=$(get_url_base)
    local gfarm_path=$(echo "$1" | url_path_encode)
    local local_path="$2"
    
    local url="${url_base}/file/${gfarm_path}"
    local opts=($(build_curl_opts))
    opts+=("-R")  # --remote-time
    
    if [ "$local_path" = "-" ]; then
        exec "${BIN_DIR}/jwt-curl" "${opts[@]}" "$url"
    else
        exec "${BIN_DIR}/jwt-curl" "${opts[@]}" -o "$local_path" "$url"
    fi
}

cmd_upload() {
    if [ $# -ne 2 ]; then
        ERR "Both Local-path and Gfarm-path are required"
        exit 1
    fi
    
    local url_base=$(get_url_base)
    local local_path="$1"
    local gfarm_path=$(echo "$2" | url_path_encode)
    
    local url="${url_base}/file/${gfarm_path}"
    local opts=($(build_curl_opts))
    
    exec "${BIN_DIR}/jwt-curl-upload" "$local_path" "$url" "${opts[@]}"
}

cmd_mkdir() {
    if [ $# -ne 1 ]; then
        ERR "Gfarm-path is required"
        exit 1
    fi
    
    local url_base=$(get_url_base)
    local gfarm_path=$(echo "$1" | url_path_encode)
    
    local url="${url_base}/dir/${gfarm_path}"
    local opts=($(build_curl_opts))
    
    exec "${BIN_DIR}/jwt-curl" -X PUT "${opts[@]}" "$url"
}

cmd_rm() {
    if [ $# -ne 1 ]; then
        ERR "Gfarm-path is required"
        exit 1
    fi
    
    local url_base=$(get_url_base)
    local gfarm_path=$(echo "$1" | url_path_encode)
    
    local url="${url_base}/file/${gfarm_path}"
    local opts=($(build_curl_opts))
    
    exec "${BIN_DIR}/jwt-curl" -X DELETE "${opts[@]}" "$url"
}

cmd_rmdir() {
    if [ $# -ne 1 ]; then
        ERR "Gfarm-path is required"
        exit 1
    fi
    
    local url_base=$(get_url_base)
    local gfarm_path=$(echo "$1" | url_path_encode)
    
    local url="${url_base}/dir/${gfarm_path}"
    local opts=($(build_curl_opts))
    
    exec "${BIN_DIR}/jwt-curl" -X DELETE "${opts[@]}" "$url"
}

cmd_chmod() {
    if [ $# -ne 2 ]; then
        ERR "Both mode and Gfarm-path are required"
        exit 1
    fi
    
    local url_base=$(get_url_base)
    local mode="$1"
    local gfarm_path=$(echo "$2" | url_path_encode)
    
    local url="${url_base}/attr/${gfarm_path}"
    local opts=($(build_curl_opts))
    
    local headers=("-X" "POST" "-d" "@-" "-H" "Content-Type: application/json")
    
    exec "${BIN_DIR}/jwt-curl" "${headers[@]}" "${opts[@]}" "$url" <<EOF
{
  "Mode": "$mode"
}
EOF
}

cmd_stat() {
    if [ $# -ne 1 ]; then
        ERR "Gfarm-path is required"
        exit 1
    fi
    
    local url_base=$(get_url_base)
    local gfarm_path=$(echo "$1" | url_path_encode)
    
    local url="${url_base}/attr/${gfarm_path}"
    local opts=($(build_curl_opts))
    
    exec "${BIN_DIR}/jwt-curl" "${opts[@]}" "$url"
}

cmd_mv() {
    if [ $# -ne 2 ]; then
        ERR "Both source and destination paths are required"
        exit 1
    fi
    
    local url_base=$(get_url_base)
    local src_path=$(echo "$1" | url_path_encode)
    local dst_path="$2"
    
    local url="${url_base}/file/${src_path}"
    local opts=($(build_curl_opts))
    
    local headers=("-X" "PATCH" "-d" "@-" "-H" "Content-Type: application/json")
    
    exec "${BIN_DIR}/jwt-curl" "${headers[@]}" "${opts[@]}" "$url" <<EOF
{
  "Destination": "$dst_path"
}
EOF
}

cmd_whoami() {
    local url_base=$(get_url_base)
    local url="${url_base}/whoami"
    local opts=($(build_curl_opts))
    
    exec "${BIN_DIR}/jwt-curl" "${opts[@]}" "$url"
}

# Help functions
show_help() {
    cat << EOF
Usage: $0 [global-options] <command> [command-options] [arguments]

Global options:
  -k, --insecure    Insecure connection
  -v, --verbose     Verbose mode
  -h, --help        Show this help message

Commands:
  ls        List directory contents
  download  Download file from Gfarm
  upload    Upload file to Gfarm
  mkdir     Create directory
  rm        Remove file
  rmdir     Remove directory
  chmod     Change file permissions
  stat      Get file status
  mv        Move/rename file
  whoami    Show current user

Environment variables:
  GFARM_HTTP_URL       the base URL of gfarm-http-gateway. (required)
  GFARM_SASL_USER      SASL username. (optional)
  GFARM_SASL_PASSWORD  SASL password. (optional)
  JWT_USER_PATH        the file of JWT or SASL password. (optional)

Use '$0 <command> --help' for more information on a command.
EOF
}

show_command_help() {
    local cmd="$1"
    case "$cmd" in
        ls)
            echo "Usage: $0 ls [options] Gfarm-path"
            echo "Options:"
            echo "  -a, --all         Do not hide entries starting with '.'"
            echo "  -e, --effective   Display effective permissions"
            echo "  -l, --long        List in long format"
            echo "  -R, --recursive   Recursively list subdirectories"
            ;;
        download)
            echo "Usage: $0 download [options] Gfarm-path Local-path"
            ;;
        upload)
            echo "Usage: $0 upload [options] Local-path Gfarm-path"
            ;;
        mkdir)
            echo "Usage: $0 mkdir [options] Gfarm-path"
            ;;
        rm)
            echo "Usage: $0 rm [options] Gfarm-path"
            ;;
        rmdir)
            echo "Usage: $0 rmdir [options] Gfarm-path"
            ;;
        chmod)
            echo "Usage: $0 chmod [options] mode(octal) Gfarm-path"
            ;;
        stat)
            echo "Usage: $0 stat [options] Gfarm-path"
            ;;
        mv)
            echo "Usage: $0 mv [options] source destination"
            ;;
        whoami)
            echo "Usage: $0 whoami [options]"
            ;;
        *)
            echo "Unknown command: $cmd"
            exit 1
            ;;
    esac
}

# Main script
opt_insecure=0
opt_verbose=0
command=""
command_args=()

# Parse global options
while [[ $# -gt 0 ]]; do
    case $1 in
        -k|--insecure)
            opt_insecure=1
            shift
            ;;
        -v|--verbose)
            opt_verbose=1
            set -x
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            ERR "Unknown global option: $1"
            show_help
            exit 1
            ;;
        *)
            command="$1"
            shift
            command_args=("$@")
            break
            ;;
    esac
done

# Check if command is provided
if [ -z "$command" ]; then
    show_help
    exit 1
fi

# Check for command help
if [ ${#command_args[@]} -gt 0 ] && [[ "${command_args[0]}" == "--help" || "${command_args[0]}" == "-h" ]]; then
    show_command_help "$command"
    exit 0
fi

# Execute command
case "$command" in
    ls)
        cmd_ls "${command_args[@]}"
        ;;
    download)
        cmd_download "${command_args[@]}"
        ;;
    upload)
        cmd_upload "${command_args[@]}"
        ;;
    mkdir)
        cmd_mkdir "${command_args[@]}"
        ;;
    rm)
        cmd_rm "${command_args[@]}"
        ;;
    rmdir)
        cmd_rmdir "${command_args[@]}"
        ;;
    chmod)
        cmd_chmod "${command_args[@]}"
        ;;
    stat)
        cmd_stat "${command_args[@]}"
        ;;
    mv)
        cmd_mv "${command_args[@]}"
        ;;
    whoami)
        cmd_whoami "${command_args[@]}"
        ;;
    *)
        ERR "Unknown command: $command"
        show_help
        exit 1
        ;;
esac