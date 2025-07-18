#!/usr/bin/env python3
"""
gfarm-http - HTTP gateway for Gfarm filesystem
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path

def get_source_dir():
    """Get the source directory relative to this script"""
    return Path(__file__).parent.parent.resolve()

def get_api_dir():
    """Get the API directory"""
    return get_source_dir() / "api"

def get_venv_dir():
    """Get the virtual environment directory"""
    return get_source_dir() / "venv"

def get_uvicorn_path():
    """Get the uvicorn executable path"""
    return get_venv_dir() / "bin" / "uvicorn"

def main():
    parser = argparse.ArgumentParser(
        description="HTTP gateway for Gfarm filesystem",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    # Add common uvicorn arguments
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--workers", type=int, help="Number of worker processes")
    parser.add_argument("--proxy-headers", action="store_true", help="Enable proxy headers")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    parser.add_argument("--log-level", default="info", help="Log level")
    
    # Parse known args to allow passing through additional uvicorn options
    args, unknown = parser.parse_known_args()
    
    # Set up environment
    src_dir = get_source_dir()
    api_dir = get_api_dir()
    uvicorn_path = get_uvicorn_path()
    
    # Check if uvicorn exists
    if not uvicorn_path.exists():
        print(f"Error: uvicorn not found at {uvicorn_path}", file=sys.stderr)
        print("Please ensure the virtual environment is set up correctly.", file=sys.stderr)
        sys.exit(1)
    
    # Build uvicorn command
    cmd = [str(uvicorn_path), "gfarm_http:app"]
    
    # Add parsed arguments
    cmd.extend(["--host", args.host])
    cmd.extend(["--port", str(args.port)])
    
    if args.workers:
        cmd.extend(["--workers", str(args.workers)])
    
    if args.proxy_headers:
        cmd.append("--proxy-headers")
    
    if args.reload:
        cmd.append("--reload")
    
    cmd.extend(["--log-level", args.log_level])
    
    # Add any unknown arguments
    cmd.extend(unknown)
    
    # Set environment variables
    env = os.environ.copy()
    env["PYTHONPATH"] = str(api_dir)
    
    # Change to source directory and execute
    try:
        os.chdir(src_dir)
        subprocess.exec(cmd, env=env)
    except FileNotFoundError:
        print(f"Error: Could not execute {cmd[0]}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()