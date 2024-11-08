import asyncio
import threading
import subprocess
import selectors
import mimetypes
from typing import Union
import re

from pydantic import BaseModel

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse, Response


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


# def gfexport(path):
#     args = ['gfexport', path]
#     return subprocess.Popen(
#         args, shell=False, close_fds=True,
#         stdin=subprocess.DEVNULL,
#         stdout=subprocess.PIPE,
#         stderr=subprocess.PIPE)


async def async_gfexport(path):
    args = [path]
    return await asyncio.create_subprocess_exec(
        'gfexport', *args,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


# def gfls(path):
#     args = ['gfls', '-l', path]
#     return subprocess.Popen(
#         args, shell=False, close_fds=True, universal_newlines=True,
#         stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
#         stderr=subprocess.STDOUT)  #TODO stderr


async def async_gfls(path, _all=0):
    args = ['-l']
    if _all == 1:
        args.append('-a')
    args.append(path)
    return await asyncio.create_subprocess_exec(
        'gfls', *args,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT)  #TODO stderr


# SEE ALSO: gfptar
PAT_ENTRY = re.compile(r'^\s*(\d+)\s+([-dl]\S+)\s+(\d+)\s+(\S+)\s+(\S+)\s+'
                       r'(\d+)\s+(\S+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+(.+)$')

async def async_size(path):
    args = ['-ilTd', path]
    p = await asyncio.create_subprocess_exec(
        'gfls', *args,
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


async def log_stderr(process: asyncio.subprocess.Process) -> None:
    while True:
        line = await process.stderr.readline()
        if line:
            print(f"STDERR: {line.decode().strip()}")  # TODO log
        else:
            break


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


#async def hello() -> Item:
@app.get("/", response_model=Item)
async def hello():
    #return {"Hello":"World!", "abc": 123456}
    external_data = {"name": "gfarm",
                     "description": "Gfarm filesystem",
                     "price": 100,
                     "tax": 1.2}
    i = Item(**external_data)
    return i


@app.get("/d/{gfarm_path:path}")
@app.get("/dir/{gfarm_path:path}")
@app.get("/directories/{gfarm_path:path}")
async def dir_list(gfarm_path: str, a: int = 0):
    gfarm_path = fullpath(gfarm_path)
    print(f"path={gfarm_path}")
    #p = gfls(gfarm_path)
    #s = p.stdout.read()
    p = await async_gfls(gfarm_path, _all=a)
    data = await p.stdout.read()
    s = data.decode()
    #print(s)
    headers = {"X-Custom-Header": "custom_value"}
    return PlainTextResponse(content=s, headers=headers)


#BUFSIZE = 1
#BUFSIZE = 65536
BUFSIZE = 1024 * 1024

@app.get("/f/{gfarm_path:path}")
@app.get("/files/{gfarm_path:path}")
async def file_export(gfarm_path: str):
    gfarm_path = fullpath(gfarm_path)
    #print(gfarm_path)

    is_file, size = await async_size(gfarm_path)
    if not is_file:
        raise HTTPException(
            status_code=415,
            detail="The requested URL does not represent a file."
        )

    if int(size) <= 0:
        return Response(status_code=204)

    p = await async_gfexport(gfarm_path)
    stderr_task = asyncio.create_task(log_stderr(p))

    # size > 0
    first_byte = await p.stdout.read(1)
    if not first_byte:
        await stderr_task
        raise HTTPException(
            status_code=500,
            detail=f"Cannot read: path={gfarm_path}"
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
