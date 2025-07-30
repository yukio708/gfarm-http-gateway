#!/usr/bin/env python3
"""
gfarm-http - HTTP client for Gfarm filesystem operations
"""

import os
import sys
import json
import argparse
import urllib.parse
import urllib.request
import urllib.error
import base64
import ssl
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
        auth_str = base64.b64encode(
            f"{sasl_user}:{sasl_password}".encode()).decode()
        return {"Authorization": f"Basic {auth_str}"}
    else:
        token = get_jwt_token()
        if token:
            return {"Authorization": f"Bearer {token}"}
        else:
            print("Error: Environment variable JWT_USER_PATH (or, "
                  "GFARM_SASL_USER and GFARM_SASL_PASSWORD) is required",
                  file=sys.stderr)
            sys.exit(1)


def make_http_request(url, method="GET", data=None, headers=None,
                      output_file=None, upload_file=None, verbose=False,
                      insecure=False):
    """Make authenticated HTTP request using urllib"""
    auth_headers = get_auth_headers()

    # Prepare headers
    req_headers = {}
    req_headers.update(auth_headers)
    if headers:
        req_headers.update(headers)

    # Prepare data and content type
    request_data = None
    if data:
        if isinstance(data, dict):
            request_data = json.dumps(data).encode('utf-8')
            req_headers['Content-Type'] = 'application/json'
        else:
            request_data = (data.encode('utf-8')
                            if isinstance(data, str) else data)

    # Handle file upload
    if upload_file:
        if upload_file == "-":
            request_data = sys.stdin.buffer.read()
        else:
            upload_path = Path(upload_file)
            if upload_path.exists():
                # Add file timestamp header
                mtime = int(upload_path.stat().st_mtime)
                req_headers['X-File-Timestamp'] = str(mtime)
                with open(upload_path, 'rb') as f:
                    request_data = f.read()
            else:
                print(f"Error: File not found: {upload_file}", file=sys.stderr)
                sys.exit(1)

    # Create request
    req = urllib.request.Request(url, data=request_data,
                                 headers=req_headers, method=method)

    # Create SSL context
    ssl_context = ssl.create_default_context()
    if insecure:
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

    try:
        if verbose:
            print(f"Making {method} request to {url}", file=sys.stderr)
            for key, value in req_headers.items():
                print(f"Header: {key}: {value}", file=sys.stderr)

        with urllib.request.urlopen(req, context=ssl_context) as response:
            response_data = response.read()

            # Handle output
            if output_file:
                if output_file == "-":
                    sys.stdout.buffer.write(response_data)
                else:
                    with open(output_file, 'wb') as f:
                        f.write(response_data)
                    # Set file timestamp if available
                    if 'Last-Modified' in response.headers:
                        from email.utils import parsedate_to_datetime
                        try:
                            dt = parsedate_to_datetime(
                                response.headers['Last-Modified'])
                            timestamp = dt.timestamp()
                            os.utime(output_file, (timestamp, timestamp))
                        except Exception:
                            pass
            else:
                # Print to stdout
                try:
                    print(response_data.decode('utf-8'), end='')
                except UnicodeDecodeError:
                    sys.stdout.buffer.write(response_data)

    except urllib.error.HTTPError as e:
        error_data = e.read()
        try:
            error_text = error_data.decode('utf-8')
            print(f"HTTP {e.code} Error: {error_text}", file=sys.stderr)
        except UnicodeDecodeError:
            print(f"HTTP {e.code} Error", file=sys.stderr)
            sys.stderr.buffer.write(error_data)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"URL Error: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error making HTTP request: {e}", file=sys.stderr)
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


def get_common_options(args):
    """Get common HTTP options from args"""
    return {
        'verbose': getattr(args, 'verbose', False),
        'insecure': getattr(args, 'insecure', False)
    }


def cmd_ls(args):
    """List directory contents"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)

    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])

    params = []
    if args.all:
        params.append("show_hidden=1")
    if args.effective:
        params.append("effperm=1")
    if args.long:
        params.append("long_format=1")
    if args.recursive:
        params.append("recursive=1")

    params_str = "?" + "&".join(params) if params else ""
    url = f"{url_base}/dir/{gfarm_path}{params_str}"

    opts = get_common_options(args)
    make_http_request(url, **opts)


def cmd_download(args):
    """Download file from Gfarm"""
    if len(args.path) != 2:
        print("Error: Both Gfarm-path and Local-path are required",
              file=sys.stderr)
        sys.exit(1)

    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])
    local_path = args.path[1]

    url = f"{url_base}/file/{gfarm_path}"

    opts = get_common_options(args)
    make_http_request(url, output_file=local_path, **opts)


def cmd_upload(args):
    """Upload file to Gfarm"""
    if len(args.path) != 2:
        print("Error: Both Local-path and Gfarm-path are required",
              file=sys.stderr)
        sys.exit(1)

    url_base = get_url_base()
    local_path = args.path[0]
    gfarm_path = url_path_encode(args.path[1])

    url = f"{url_base}/file/{gfarm_path}"

    opts = get_common_options(args)
    make_http_request(url, method="PUT", upload_file=local_path, **opts)


def cmd_mkdir(args):
    """Create directory"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)

    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])

    url = f"{url_base}/dir/{gfarm_path}"

    opts = get_common_options(args)
    make_http_request(url, method="PUT", **opts)


def cmd_rm(args):
    """Remove file"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)

    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])

    url = f"{url_base}/file/{gfarm_path}"

    opts = get_common_options(args)
    make_http_request(url, method="DELETE", **opts)


def cmd_rmdir(args):
    """Remove directory"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)

    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])

    url = f"{url_base}/dir/{gfarm_path}"

    opts = get_common_options(args)
    make_http_request(url, method="DELETE", **opts)


def cmd_chmod(args):
    """Change file permissions"""
    if len(args.path) != 2:
        print("Error: Both mode and Gfarm-path are required", file=sys.stderr)
        sys.exit(1)

    url_base = get_url_base()
    mode = args.path[0]
    gfarm_path = url_path_encode(args.path[1])

    url = f"{url_base}/attr/{gfarm_path}"

    opts = get_common_options(args)
    data = {"Mode": mode}
    make_http_request(url, method="POST", data=data, **opts)


def cmd_stat(args):
    """Get file status"""
    if not args.path:
        print("Error: Gfarm-path is required", file=sys.stderr)
        sys.exit(1)

    url_base = get_url_base()
    gfarm_path = url_path_encode(args.path[0])

    url = f"{url_base}/attr/{gfarm_path}"

    opts = get_common_options(args)
    make_http_request(url, **opts)


def cmd_mv(args):
    """Move/rename file"""
    if len(args.path) != 2:
        print("Error: Both source and destination paths are required",
              file=sys.stderr)
        sys.exit(1)

    url_base = get_url_base()
    src_path = url_path_encode(args.path[0])
    dst_path = args.path[1]

    url = f"{url_base}/file/{src_path}"

    opts = get_common_options(args)
    data = {"Destination": dst_path}
    make_http_request(url, method="PATCH", data=data, **opts)


def cmd_whoami(args):
    """Show current user"""
    url_base = get_url_base()
    url = f"{url_base}/conf/me"

    opts = get_common_options(args)
    make_http_request(url, **opts)


def main():
    parser = argparse.ArgumentParser(
        description="HTTP client for Gfarm filesystem operations",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    # Common options
    parser.add_argument("-k", "--insecure", action="store_true",
                        help="Insecure connection")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Verbose mode")

    subparsers = parser.add_subparsers(dest='command',
                                       help='Available commands')

    # ls command
    ls_parser = subparsers.add_parser('ls', help='List directory contents')
    ls_parser.add_argument('-a', '--all', action='store_true',
                           help="Do not hide entries starting with '.'")
    ls_parser.add_argument('-e', '--effective', action='store_true',
                           help="Display effective permissions")
    ls_parser.add_argument('-l', '--long', action='store_true',
                           help="List in long format")
    ls_parser.add_argument('-R', '--recursive', action='store_true',
                           help="Recursively list subdirectories")
    ls_parser.add_argument('path', nargs=1, help='Gfarm path')

    # download command
    dl_parser = subparsers.add_parser('download',
                                      help='Download file from Gfarm')
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
    chmod_parser = subparsers.add_parser('chmod',
                                         help='Change file permissions')
    chmod_parser.add_argument('path', nargs=2, help='mode(octal) Gfarm-path')

    # stat command
    stat_parser = subparsers.add_parser('stat', help='Get file status')
    stat_parser.add_argument('path', nargs=1, help='Gfarm path')

    # mv command
    mv_parser = subparsers.add_parser('mv', help='Move/rename file')
    mv_parser.add_argument('path', nargs=2, help='source destination')

    # whoami command
    subparsers.add_parser('whoami', help='Show current user')

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
