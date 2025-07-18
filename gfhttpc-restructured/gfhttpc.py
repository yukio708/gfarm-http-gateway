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
from pathlib import Path

def get_bin_dir():
    """Get the bin directory relative to this script"""
    return Path(__file__).parent.parent / "bin"

def get_jwt_curl_path():
    """Get the jwt-curl executable path"""
    return get_bin_dir() / "jwt-curl"

def get_jwt_curl_upload_path():
    """Get the jwt-curl-upload executable path"""
    return get_bin_dir() / "jwt-curl-upload"

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
    jwt_curl = get_jwt_curl_path()
    
    subprocess.exec([str(jwt_curl)] + opts + [url])

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
    jwt_curl = get_jwt_curl_path()
    
    if local_path == "-":
        subprocess.exec([str(jwt_curl)] + opts + [url])
    else:
        subprocess.exec([str(jwt_curl)] + opts + ["-o", local_path, url])

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
    jwt_curl_upload = get_jwt_curl_upload_path()
    
    subprocess.exec([str(jwt_curl_upload), local_path, url] + opts)

def cmd_mkdir(args):
    """Create directory"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    
    url = f"{url_base}/dir/{gfarm_path}"
    
    opts = build_curl_opts(args)
    jwt_curl = get_jwt_curl_path()
    
    subprocess.exec([str(jwt_curl), "-X", "PUT"] + opts + [url])

def cmd_rm(args):
    """Remove file"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    
    url = f"{url_base}/file/{gfarm_path}"
    
    opts = build_curl_opts(args)
    jwt_curl = get_jwt_curl_path()
    
    subprocess.exec([str(jwt_curl), "-X", "DELETE"] + opts + [url])

def cmd_rmdir(args):
    """Remove directory"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    
    url = f"{url_base}/dir/{gfarm_path}"
    
    opts = build_curl_opts(args)
    jwt_curl = get_jwt_curl_path()
    
    subprocess.exec([str(jwt_curl), "-X", "DELETE"] + opts + [url])

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
    jwt_curl = get_jwt_curl_path()
    
    data = json.dumps({"Mode": mode})
    
    subprocess.exec([str(jwt_curl), "-X", "POST", "-d", data, "-H", "Content-Type: application/json"] + opts + [url])

def cmd_stat(args):
    """Get file status"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    
    url = f"{url_base}/attr/{gfarm_path}"
    
    opts = build_curl_opts(args)
    jwt_curl = get_jwt_curl_path()
    
    subprocess.exec([str(jwt_curl)] + opts + [url])

def cmd_mv(args):
    """Move/rename file"""
    if len(args.path) != 2:
        print("Error: Both source and destination paths are required", file=sys.stderr)
        sys.exit(1)
    
    url_base = get_url_base()
    src_path = url_path_encode(args.path[0])
    dst_path = url_path_encode(args.path[1])
    
    url = f"{url_base}/file/{src_path}"
    
    opts = build_curl_opts(args)
    jwt_curl = get_jwt_curl_path()
    
    data = json.dumps({"Destination": args.path[1]})
    
    subprocess.exec([str(jwt_curl), "-X", "PATCH", "-d", data, "-H", "Content-Type: application/json"] + opts + [url])

def cmd_whoami(args):
    """Show current user"""
    url_base = get_url_base()
    url = f"{url_base}/whoami"
    
    opts = build_curl_opts(args)
    jwt_curl = get_jwt_curl_path()
    
    subprocess.exec([str(jwt_curl)] + opts + [url])

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