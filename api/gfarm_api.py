import os
import asyncio
import threading
import subprocess
import selectors
import mimetypes
from typing import Union
import re
import base64

from pydantic import BaseModel

from fastapi import FastAPI, Header, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse, Response
from fastapi.security import OAuth2PasswordBearer


script_path = os.path.abspath(__file__)
parent_dir = os.path.dirname(script_path)
top_dir = os.path.dirname(parent_dir)

app = FastAPI()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_content_type(filename):
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or 'application/octet-stream'


def fullpath(path):
    return "/" + path


# TODO xoauth2_user_claim -> user_claim param
user_claim = 'hpci.id'  #TODO


# def gfexport(path):
#     args = ['gfexport', path]
#     return subprocess.Popen(
#         args, shell=False, close_fds=True,
#         stdin=subprocess.DEVNULL,
#         stdout=subprocess.PIPE,
#         stderr=subprocess.PIPE)

AUTHZ_TYPE_BASIC = 'Basic'
AUTHZ_TYPE_BEARER = 'Bearer'

def parse_authorization(authz_str):
    authz_type = None
    user = None
    passwd = None
    no_authz = HTTPException(
        status_code=401,
        detail=f"Invalid Authorization header"
    )
    if authz_str:
        authz = authz_str.split()
        if len(authz) >= 2:
            authz_type = authz[0]
            authz_token = authz[1]
            if authz_type == AUTHZ_TYPE_BASIC:
                try:
                    b = base64.b64decode(authz_token.encode())
                    user_pass_str = b.decode()
                except Exception:
                    raise no_authz
                user_pass = user_pass_str.split(":")
                if len(user_pass) >= 2:
                    user = user_pass[0]
                    passwd = user_pass[1]
                else:
                    raise no_authz
            elif authz_type == AUTHZ_TYPE_BEARER:
                passwd = authz_token
            else:
                raise no_authz
        else:
            raise no_authz
    else:
        raise no_authz
    return authz_type, user, passwd


def convert_authorization(authorization):
    #print(f"authorization={authorization}")
    authz_type, user, passwd = parse_authorization(authorization)
    #TODO anonymous, sasl_user
    token = passwd

    #env = os.environ.copy()
    env = {'PATH': os.environ['PATH']}
    if token:
        env.update({
            'GFARM_SASL_PASSWORD': token,
            'JWT_USER_PATH': f'!/{top_dir}/bin/GFARM_SASL_PASSWORD_STDOUT.sh'
        })
    return env


async def async_gfwhoami(env):
    args = []
    return await asyncio.create_subprocess_exec(
        'gfwhoami', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT)


async def async_gfexport(env, path):
    args = [path]
    return await asyncio.create_subprocess_exec(
        'gfexport', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def async_gfreg(env, path):
    args = ['-', path]
    return await asyncio.create_subprocess_exec(
        'gfreg', *args,
        env=env,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE)


async def async_gfls(env, path, _all=0, recursive=0):
    args = ['-l']
    if _all == 1:
        args.append('-a')
    if recursive == 1:
        args.append('-R')
    args.append(path)
    return await asyncio.create_subprocess_exec(
        'gfls', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT)  #TODO stderr?


# SEE ALSO: gfptar
PAT_ENTRY = re.compile(r'^\s*(\d+)\s+([-dl]\S+)\s+(\d+)\s+(\S+)\s+(\S+)\s+'
                       r'(\d+)\s+(\S+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+(.+)$')

async def async_size(env, path):
    args = ['-ilTd', path]
    p = await asyncio.create_subprocess_exec(
        'gfls', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL)
    line = await p.stdout.readline()
    line = line.decode().rstrip()
    print(line)
    m = PAT_ENTRY.match(line)
    if m:
        # Ex.
        # 12345 -rw-rw-r-- 1 user1 group1 29 Jan 1 00:00:00 2022 fname
        # inum = int(m.group(1))
        mode_str = m.group(2)
        # nlink = int(m.group(3))
        # uname = m.group(4)
        # gname = m.group(5)
        size = int(m.group(6))
        # mtime_str = m.group(7)
        # name = m.group(8)
    else:
        mode_str = "?"
        size = -1

    is_file = mode_str[0] == '-'
    return is_file, size


async def log_stderr(process: asyncio.subprocess.Process, elist: list) -> None:
    while True:
        line = await process.stderr.readline()
        if line:
            msg = line.decode().strip()
            print(f"STDERR: {msg}")  # TODO log
            elist.append(msg)
        else:
            break


#TODO remove
class Item(BaseModel):
    name: str
    description: Union[str, None] = None
    price: float
    tax: Union[float, None] = None

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "name": "Foo",
                    "description": "A very nice Item",
                    "price": 35.4,
                    "tax": 3.2,
                }
            ]
        }


#TODO remove
#async def hello() -> Item:
@app.get("/", response_model=Item)
async def hello(request: Request):
    print(request.headers)

    #return {"Hello":"World!", "abc": 123456}
    external_data = {"name": "gfarm",
                     "description": "Gfarm filesystem",
                     "price": 100,
                     "tax": 1.2}
    i = Item(**external_data)
    return i


@app.get("/c/me")
@app.get("/config/me")
async def whoami(authorization: Union[str, None] = Header(default=None)):
    env = convert_authorization(authorization)
    p = await async_gfwhoami(env)
    data = await p.stdout.read()
    s = data.decode()
    return_code = await p.wait()
    if return_code != 0:
        print(f"return_code={return_code}")  #TODO log
        if "authentication error" in s:
            raise HTTPException(
                status_code=401,
                detail="Authentication error"
            )
        raise HTTPException(
            status_code=500,
            detail=s
        )
    return PlainTextResponse(content=s)


@app.get("/d/{gfarm_path:path}")
@app.get("/dir/{gfarm_path:path}")
@app.get("/directories/{gfarm_path:path}")
async def dir_list(gfarm_path: str,
                   a: int = 0,
                   R: int = 0,
                   ign_err: int = 0,
                   authorization: Union[str, None] = Header(default=None)):
    gfarm_path = fullpath(gfarm_path)
    env = convert_authorization(authorization)
    #print(f"path={gfarm_path}")
    p = await async_gfls(env, gfarm_path, _all=a, recursive=R)
    data = await p.stdout.read()
    s = data.decode()
    return_code = await p.wait()
    if ign_err == 0 and return_code != 0:
        print(f"return_code={return_code}")  #TODO log
        raise HTTPException(
            status_code=500,
            detail=s
        )
    #print(s)
    #headers = {"X-Custom-Header": "custom_value"}
    #return PlainTextResponse(content=s, headers=headers)
    return PlainTextResponse(content=s)


#BUFSIZE = 1
#BUFSIZE = 65536
BUFSIZE = 1024 * 1024

@app.get("/f/{gfarm_path:path}")
@app.get("/file/{gfarm_path:path}")
@app.get("/files/{gfarm_path:path}")
async def file_export(gfarm_path: str,
                      authorization: Union[str, None] = Header(default=None)):
    env = convert_authorization(authorization)
    gfarm_path = fullpath(gfarm_path)
    #print(gfarm_path)

    is_file, size = await async_size(env, gfarm_path)
    if not is_file:
        raise HTTPException(
            status_code=415,
            detail="The requested URL does not represent a file."
        )

    if int(size) <= 0:
        return Response(status_code=204)

    p = await async_gfexport(env, gfarm_path)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(p, elist))

    # size > 0
    first_byte = await p.stdout.read(1)
    if not first_byte:
        await stderr_task
        raise HTTPException(
            status_code=500,
            detail=f"Cannot read: path={gfarm_path}, {str(elist)}"
        )

    async def generate():
        yield first_byte

        while True:
            d = await p.stdout.read(BUFSIZE)
            if not d:
                break
            yield d
        await stderr_task
        return_code = await p.wait()
        if return_code != 0:
            print(f"return_code={return_code}")  #TODO log

    ct = get_content_type(gfarm_path)
    cl = str(size)
    return StreamingResponse(content=generate(), media_type=ct,
                             headers={"content-length": cl})


@app.put("/f/{gfarm_path:path}")
@app.put("/file/{gfarm_path:path}")
@app.put("/files/{gfarm_path:path}")
async def file_import(gfarm_path: str,
                      request: Request,
                      authorization: Union[str, None] = Header(default=None)):
    env = convert_authorization(authorization)
    gfarm_path = fullpath(gfarm_path)

    p = await async_gfreg(env, gfarm_path)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(p, elist))
    try:
        async for chunk in request.stream():
            #print(f"chunk={str(chunk)}")
            #print(f"chunk len={len(chunk)}")
            p.stdin.write(chunk)
            await p.stdin.drain()  # speedup
    except Exception as e:
        print(f"{str(e)}") #TODO log
        raise HTTPException(
            status_code=500,
            detail=f"Cannot write: path={gfarm_path}, error={str(e)}, stderr={str(elist)}"
        )
    p.stdin.close()
    await stderr_task
    return_code = await p.wait()
    if return_code != 0:
        print(f"return_code={return_code}")  #TODO log
        raise HTTPException(
            status_code=500,
            detail=f"Cannot write: path={gfarm_path}, {str(elist)}"
        )
    return Response(status_code=200)
