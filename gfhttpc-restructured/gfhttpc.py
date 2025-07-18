#!/usr/bin/env python3
"""
gfhttpc - HTTP client for Gfarm filesystem operations
"""

import os
import sys
import json
import argparse
import subprocess
import urllib.parse
import base64
import stat
from pathlib import Path

def get_jwt_token():
    """Get JWT token from file or environment"""
    jwt_path = os.environ.get('JWT_USER_PATH')
    if not jwt_path:
        uid = os.getuid()
        jwt_path = f"/tmp/jwt_user_u{uid}/token.jwt"
    
    if os.path.exists(jwt_path):
        with open(jwt_path, 'r') as f:
            return f.read().strip()
    return None

def get_auth_headers():
    """Get authentication headers for requests"""
    sasl_user = os.environ.get('GFARM_SASL_USER')
    sasl_password = os.environ.get('GFARM_SASL_PASSWORD')
    
    if sasl_user == "anonymous":
        return {}
    elif sasl_user and sasl_password:
        auth_str = base64.b64encode(f"{sasl_user}:{sasl_password}".encode()).decode()
        return {"Authorization": f"Basic {auth_str}"}
    else:
        token = get_jwt_token()
        if token:
            return {"Authorization": f"Bearer {token}"}
        else:
            print("Error: Environment variable JWT_USER_PATH (or, GFARM_SASL_USER and GFARM_SASL_PASSWORD) is required", file=sys.stderr)
            sys.exit(1)

def make_curl_request(url, method="GET", data=None, headers=None, output_file=None, upload_file=None, curl_opts=None):
    """Make authenticated curl request"""
    auth_headers = get_auth_headers()
    
    cmd = ["curl"]
    
    # Add curl options
    if curl_opts:
        cmd.extend(curl_opts)
    
    # Add authentication headers
    for key, value in auth_headers.items():
        cmd.extend(["-H", f"{key}: {value}"])
    
    # Add additional headers
    if headers:
        for key, value in headers.items():
            cmd.extend(["-H", f"{key}: {value}"])
    
    # Set HTTP method
    if method != "GET":
        cmd.extend(["-X", method])
    
    # Add data for POST/PUT/PATCH
    if data:
        if isinstance(data, dict):
            cmd.extend(["-d", json.dumps(data)])
            cmd.extend(["-H", "Content-Type: application/json"])
        else:
            cmd.extend(["-d", data])
    
    # Handle file upload
    if upload_file:
        if upload_file == "-":
            cmd.extend(["--upload-file", "-"])
        else:
            upload_path = Path(upload_file)
            if upload_path.exists():
                # Add file timestamp header
                mtime = int(upload_path.stat().st_mtime)
                cmd.extend(["-H", f"X-File-Timestamp: {mtime}"])
                cmd.extend(["--upload-file", str(upload_path)])
            else:
                print(f"Error: File not found: {upload_file}", file=sys.stderr)
                sys.exit(1)
    
    # Handle output file
    if output_file:
        cmd.extend(["-o", output_file])
    
    # Add URL
    cmd.append(url)
    
    # Execute curl
    try:
        if sasl_user and sasl_password and sasl_user != "anonymous":
            # Use basic auth directly in curl
            cmd = ["curl", "-u", f"{sasl_user}:{sasl_password}"] + cmd[1:]
            # Remove Authorization header if present
            filtered_cmd = []
            i = 0
            while i < len(cmd):
                if cmd[i] == "-H" and i + 1 < len(cmd) and cmd[i + 1].startswith("Authorization:"):
                    i += 2  # Skip both -H and the header
                else:
                    filtered_cmd.append(cmd[i])
                    i += 1
            cmd = filtered_cmd
        
        subprocess.exec(cmd)
    except Exception as e:
        print(f"Error executing curl: {e}", file=sys.stderr)
        sys.exit(1)

def url_path_encode(path):
    """URL encode path while preserving forward slashes"""
    return urllib.parse.quote(path.lstrip('/'), safe='/')

def get_url_base():
    """Get the base URL from environment"""
    url = os.environ.get('GFARM_HTTP_URL')
    if not url:
        print("Error: GFARM_HTTP_URL is required", file=sys.stderr)
        sys.exit(1)
    return url.rstrip('/')

def build_curl_opts(args):
    """Build common curl options"""
    opts = ["--fail-with-body"]
    
    if args.verbose:
        opts.append("-v")
    else:
        opts.append("--no-progress-meter")
    
    if args.insecure:
        opts.append("-k")
    
    return opts

def cmd_ls(args):
    """List directory contents"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    
    params = []
    if args.all:
        params.append("a=1")
    if args.effective:
        params.append("e=1")
    if args.long:
        params.append("l=1")
    if args.recursive:
        params.append("R=1")
    
    params_str = "?" + "&".join(params) if params else ""
    url = f"{url_base}/dir/{gfarm_path}{params_str}"
    
    opts = build_curl_opts(args)
    make_curl_request(url, curl_opts=opts)

def cmd_download(args):
    """Download file from Gfarm"""
    if len(args.path) != 2:
        print("Error: Both Gfarm-path and Local-path are required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    local_path = args.path[1]
    
    url = f"{url_base}/file/{gfarm_path}"
    
    opts = build_curl_opts(args)
    opts.append("-R")  # --remote-time
    
    if local_path == "-":
        make_curl_request(url, curl_opts=opts)
    else:
        make_curl_request(url, curl_opts=opts, output_file=local_path)

def cmd_upload(args):
    """Upload file to Gfarm"""
    if len(args.path) != 2:
        print("Error: Both Local-path and Gfarm-path are required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    local_path = args.path[0]
    gfarm_path = url_path_encode(args.path[1])
    
    url = f"{url_base}/file/{gfarm_path}"
    
    opts = build_curl_opts(args)
    make_curl_request(url, method="PUT", curl_opts=opts, upload_file=local_path)

def cmd_mkdir(args):
    """Create directory"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    
    url = f"{url_base}/dir/{gfarm_path}"
    
    opts = build_curl_opts(args)
    make_curl_request(url, method="PUT", curl_opts=opts)

def cmd_rm(args):
    """Remove file"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    
    url = f"{url_base}/file/{gfarm_path}"
    
    opts = build_curl_opts(args)
    make_curl_request(url, method="DELETE", curl_opts=opts)

def cmd_rmdir(args):
    """Remove directory"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    
    url = f"{url_base}/dir/{gfarm_path}"
    
    opts = build_curl_opts(args)
    make_curl_request(url, method="DELETE", curl_opts=opts)

def cmd_chmod(args):
    """Change file permissions"""
    if len(args.path) != 2:
        print("Error: Both mode and Gfarm-path are required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    mode = args.path[0]
    gfarm_path = url_path_encode(args.path[1])
    
    url = f"{url_base}/attr/{gfarm_path}"
    
    opts = build_curl_opts(args)
    data = {"Mode": mode}
    make_curl_request(url, method="POST", data=data, curl_opts=opts)

def cmd_stat(args):
    """Get file status"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    
    url = f"{url_base}/attr/{gfarm_path}"
    
    opts = build_curl_opts(args)
    make_curl_request(url, curl_opts=opts)

def cmd_mv(args):
    """Move/rename file"""
    if len(args.path) != 2:
        print("Error: Both source and destination paths are required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    src_path = url_path_encode(args.path[0])
    dst_path = args.path[1]
    
    url = f"{url_base}/file/{src_path}"
    
    opts = build_curl_opts(args)
    data = {"Destination": dst_path}
    make_curl_request(url, method="PATCH", data=data, curl_opts=opts)

def cmd_whoami(args):
    """Show current user"""
    url_base = get_url_base()
    url = f"{url_base}/whoami"
    
    opts = build_curl_opts(args)
    make_curl_request(url, curl_opts=opts)

def main():
    parser = argparse.ArgumentParser(
        description="HTTP client for Gfarm filesystem operations",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    # Common options
    parser.add_argument("-k", "--insecure", action="store_true", help="Insecure connection")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose mode")
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # ls command
    ls_parser = subparsers.add_parser('ls', help='List directory contents')
    ls_parser.add_argument('-a', '--all', action='store_true', help="Do not hide entries starting with '.'")
    ls_parser.add_argument('-e', '--effective', action='store_true', help="Display effective permissions")
    ls_parser.add_argument('-l', '--long', action='store_true', help="List in long format")
    ls_parser.add_argument('-R', '--recursive', action='store_true', help="Recursively list subdirectories")
    ls_parser.add_argument('path', nargs=1, help='Gfarm path')
    
    # download command
    dl_parser = subparsers.add_parser('download', help='Download file from Gfarm')
    dl_parser.add_argument('path', nargs=2, help='Gfarm-path Local-path')
    
    # upload command
    up_parser = subparsers.add_parser('upload', help='Upload file to Gfarm')
    up_parser.add_argument('path', nargs=2, help='Local-path Gfarm-path')
    
    # mkdir command
    mkdir_parser = subparsers.add_parser('mkdir', help='Create directory')
    mkdir_parser.add_argument('path', nargs=1, help='Gfarm path')
    
    # rm command
    rm_parser = subparsers.add_parser('rm', help='Remove file')
    rm_parser.add_argument('path', nargs=1, help='Gfarm path')
    
    # rmdir command
    rmdir_parser = subparsers.add_parser('rmdir', help='Remove directory')
    rmdir_parser.add_argument('path', nargs=1, help='Gfarm path')
    
    # chmod command
    chmod_parser = subparsers.add_parser('chmod', help='Change file permissions')
    chmod_parser.add_argument('path', nargs=2, help='mode(octal) Gfarm-path')
    
    # stat command
    stat_parser = subparsers.add_parser('stat', help='Get file status')
    stat_parser.add_argument('path', nargs=1, help='Gfarm path')
    
    # mv command
    mv_parser = subparsers.add_parser('mv', help='Move/rename file')
    mv_parser.add_argument('path', nargs=2, help='source destination')
    
    # whoami command
    whoami_parser = subparsers.add_parser('whoami', help='Show current user')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Command dispatch
    commands = {
        'ls': cmd_ls,
        'download': cmd_download,
        'upload': cmd_upload,
        'mkdir': cmd_mkdir,
        'rm': cmd_rm,
        'rmdir': cmd_rmdir,
        'chmod': cmd_chmod,
        'stat': cmd_stat,
        'mv': cmd_mv,
        'whoami': cmd_whoami,
    }
    
    if args.command in commands:
        commands[args.command](args)
    else:
        print(f"Error: Unknown command '{args.command}'", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()