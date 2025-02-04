import os
import asyncio
import mimetypes
from typing import Union
import re
import base64
from typing import Optional
import json
from pprint import pformat as pf
import time
import secrets

import requests

from pydantic import BaseModel

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth

from cryptography.fernet import Fernet

# https://github.com/mpdavis/python-jose/blob/master/jose/jwt.py
from jose import jwt

api_path = os.path.abspath(__file__)
api_dir = os.path.dirname(api_path)
top_dir = os.path.dirname(api_dir)

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://c2:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSION_SECRET = "__SECRET_KEY__"   # TODO from configuration file
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

ENCRYPT_SESSION = False  # True: not work (too large cookie)

if ENCRYPT_SESSION:
    fer = Fernet(Fernet.generate_key())
else:
    fer = None

#############################################################################

templates = Jinja2Templates(directory="templates")

# add this URL to "Valid redirect URIs" of OIDC_CLIENT_ID in Keyclaok

# not work: http://keycloak
# gfmd[]: <err> [1005366]
# SASL: xoauth2_plugin: introspect_token #012 Issuer URL must be HTTPS
# KC_SERVER = os.environ.get("OIDC_SERVER", "http://keycloak:8080")
OIDC_SERVER = os.environ.get("OIDC_SERVER", "https://keycloak:8443")
OIDC_REALM = os.environ.get("OIDC_REALM", "HPCI")
OIDC_CLIENT_ID = os.environ.get("OIDC_CLIENT_ID", "hpci-jwt-server")
OIDC_CLIENT_SECRET = os.environ.get("OIDC_CLIENT_SECRET",
                                    "eJxl5z1EHU0u6BVLpR5MG0v4NLgCZWWG")
# Keycloak
REALM_URL = f"{OIDC_SERVER}/auth/realms/{OIDC_REALM}"
OIDC_META_URL = f"{REALM_URL}/.well-known/openid-configuration"
OIDC_CERTS_URL = f"{REALM_URL}/protocol/openid-connect/certs"
OIDC_LOGOUT_URL = f"{REALM_URL}/protocol/openid-connect/logout"

AUDIENCE = "hpci"

oauth = OAuth()
oauth.register(
    name="keycloak",
    server_metadata_url=OIDC_META_URL,
    client_id=OIDC_CLIENT_ID,
    client_secret=OIDC_CLIENT_SECRET,
    client_kwargs={
        'scope': 'hpci',
        'verify': False,  # not verify certificate  # TODO True
    },
)
provider = oauth.keycloak


def set_token(request: Request, token):
    if fer:
        # dict -> JSON str -> str binary
        s = json.dumps(token).encode()
        # binary -> encrypt -> base64 bin -> base64 str
        token = base64.b64encode(fer.encrypt(s)).decode()
    print(f"set token: {token}")  # TODO
    request.session["token"] = token


async def use_refresh_token(request: Request, token):
    refresh_token = token.get("refresh_token")
    #print("use_refresh_token !!!!!!!!!!!!!!!!!!!!", refresh_token) #TODO
    meta = await provider.load_server_metadata()
    #print(pf(meta))  # TODO
    try:
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": OIDC_CLIENT_ID,
            "client_secret": OIDC_CLIENT_SECRET,
        }
        token_endpoint_url = meta.get('token_endpoint')
        # TODO use httpx
        # TODO verify=True
        response = requests.post(token_endpoint_url,
                                 data=data, verify=False)
        response.raise_for_status()
        new_token = response.json()
        set_token(request, new_token)
        return new_token
    except requests.exceptions.RequestException:
        raise


#VERIFY_TOKEN = True
VERIFY_TOKEN = False


def jwt_error(msg):
    return HTTPException(status_code=500,
                         detail=f"JWT error: {msg}")


def verify_token(token):
    try:
        access_token = token.get("access_token")
        # TODO cache jwks
        # TODO verify=True
        jwks = requests.get(OIDC_CERTS_URL, verify=False).json()
        print(pf(jwks)) #TODO
        header = jwt.get_unverified_header(access_token)
        print(pf(header)) #TODO
        if not header:
            raise jwt_error("Invalid header")
        alg = header.get("alg")
        claims = jwt.decode(
            access_token,
            jwks,
            algorithms=alg,
            audience=AUDIENCE,
        )
        return claims
    except Exception as e:
        print(f"Verify error: {e}")
        return None


def is_expired_token(token):
    if VERIFY_TOKEN:
        claims = verify_token(token)
        if not claims:
            return True  # expired
        print(pf(claims)) #TODO
        return False
    try:
        access_token = token.get("access_token")
        claims = jwt.get_unverified_claims(access_token)
        # print(pf(claims))
        # header = jwt.get_unverified_header(access_token)
        # print(pf(header))
        exp = claims.get("exp")
        if exp is None:
            raise jwt_err("no exp claim")
        current_time = int(time.time())
        return current_time > exp
    except Exception as e:
        print(f"is_expired_token: " + str(e))
        return True  # expired


async def get_token(request: Request):
    token = request.session.get("token")
    if not token:
        return None
    if fer:
        try:
            # base64 str -> bin
            b = base64.b64decode(token)
            # binary -> decrypt -> str binary -> JSON str -> dict
            token = json.loads(fer.decrypt(b).decode())
        except Exception as e:
            print("session decrypt error: " + str(e))
            return None
    if not is_expired_token(token):
        return token
    new_token = await use_refresh_token(request, token)
    return new_token


def delete_token(request: Request):
    request.session.pop("token", None)


async def get_access_token(request: Request) -> Optional[str]:
    token = await get_token(request)
    if token:
        #print("token from session: " + str(token))  # TODO
        return token.get("access_token")
    return None


def parse_access_token(access_token):
    claims = jwt.get_unverified_claims(access_token)
    header = jwt.get_unverified_header(access_token)
    return pf(header) + "\n" + pf(claims)


def get_csrf(request: Request):
    return request.session.get("csrf")


def gen_csrf(request: Request):
    csrf_token = secrets.token_urlsafe(32)
    request.session["csrf"] = csrf_token
    return csrf_token


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    access_token = await get_access_token(request)
    if access_token:
        pat = parse_access_token(access_token)
        csrf_token = gen_csrf(request)
        #print(str(type(csrf_token)) + str(csrf_token))  #TODO
        redirect_uri = request.url_for("logout")
        #print(type(redirect_uri))  #TODO
        logout_url = OIDC_LOGOUT_URL + "?client_id=" + OIDC_CLIENT_ID + "&post_logout_redirect_uri=" + str(redirect_uri) + "&state=" + csrf_token
        #print(logout_url) #TODO
        claims = jwt.get_unverified_claims(access_token)
        exp = claims.get("exp")
    else:
        pat = ""
        logout_url = ""
        exp = -1
    current_time = int(time.time())
    return templates.TemplateResponse("index.html",
                                      {"request": request,
                                       "access_token": access_token,
                                       "parsed_at": pat,
                                       "logout_url": logout_url,
                                       "current_time": current_time,
                                       "exp": exp,
                                       })


@app.get("/login")
async def login(request: Request):
    redirect_uri = request.url_for("auth")
    return await provider.authorize_redirect(request, redirect_uri)


@app.get("/auth")
async def auth(request: Request):
    try:
        token = await provider.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
    print(str(token))  # TODO
    set_token(request, token)
    return RedirectResponse(url="/")


@app.get("/logout")
async def logout(request: Request, state: Optional[str] = None):
    if state is not None:
        csrf_token = get_csrf(request)
        if state != csrf_token:
            msg = "CSRF token mismatch"
            print(msg) # TODO
            raise HTTPException(status_code=401, detail=msg)
    delete_token(request)
    return RedirectResponse(url="/")


@app.get("/access_token")
async def access_token(request: Request):
    access_token = await get_access_token(request)
    # return JSON
    return {"access_token": access_token}


###########################################
def get_content_type(filename: str):
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or 'application/octet-stream'


def fullpath(path: str):
    return "/" + path


# def gfexport(path):
#     args = ['gfexport', path]
#     return subprocess.Popen(
#         args, shell=False, close_fds=True,
#         stdin=subprocess.DEVNULL,
#         stdout=subprocess.PIPE,
#         stderr=subprocess.PIPE)

AUTHZ_TYPE_BASIC = 'Basic'
AUTHZ_TYPE_BEARER = 'Bearer'


def parse_authorization(authz_str: str):
    authz_type = None
    user = None
    passwd = None
    no_authz = HTTPException(
        status_code=401,
        detail="Invalid Authorization header"
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


async def set_env(request, authorization):
    env = {'PATH': os.environ['PATH']}

    # get access token from session
    access_token = await get_access_token(request)

    # prefer session
    if not access_token:
        # get access token from Authorization header
        # print(f"authorization={authorization}")
        authz_type, user, passwd = parse_authorization(authorization)
        # TODO anonymous, sasl_user
        access_token = passwd

    if access_token:
        env.update({
            'GFARM_SASL_PASSWORD': access_token,
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
        stderr=asyncio.subprocess.STDOUT)  # TODO stderr?


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


# TODO unused
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


# TODO unused
@app.get("/hello", response_model=Item)
async def hello(request: Request) -> Item:
    print(request.headers)

    external_data = {"name": "gfarm",
                     "description": "Gfarm filesystem",
                     "price": 100,
                     "tax": 1.2}
    i = Item(**external_data)
    return i


@app.get("/c/me")
@app.get("/config/me")
async def me(request: Request,
             authorization: Union[str, None] = Header(default=None)):
    env = await set_env(request, authorization)
    p = await async_gfwhoami(env)
    data = await p.stdout.read()
    s = data.decode()
    return_code = await p.wait()
    if return_code != 0:
        print(f"return_code={return_code}")  # TODO log
        if "authentication error" in s:
            raise HTTPException(
                status_code=401,
                detail="Authentication error: " + s
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
                   request: Request,
                   a: int = 0,
                   R: int = 0,
                   ign_err: int = 0,
                   authorization: Union[str, None] = Header(default=None)):
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    # print(f"path={gfarm_path}")
    p = await async_gfls(env, gfarm_path, _all=a, recursive=R)
    data = await p.stdout.read()
    s = data.decode()
    return_code = await p.wait()
    if ign_err == 0 and return_code != 0:
        print(f"return_code={return_code}")  # TODO log
        raise HTTPException(
            status_code=500,
            detail=s
        )
    # print(s)
    # headers = {"X-Custom-Header": "custom_value"}
    # return PlainTextResponse(content=s, headers=headers)
    return PlainTextResponse(content=s)


# BUFSIZE = 1
# BUFSIZE = 65536
BUFSIZE = 1024 * 1024


@app.get("/f/{gfarm_path:path}")
@app.get("/file/{gfarm_path:path}")
@app.get("/files/{gfarm_path:path}")
async def file_export(gfarm_path: str,
                      request: Request,
                      authorization: Union[str, None] = Header(default=None)):
    env = await set_env(request, authorization)
    gfarm_path = fullpath(gfarm_path)
    # print(gfarm_path)

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
            print(f"return_code={return_code}")  # TODO log

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
    env = await set_env(request, authorization)
    gfarm_path = fullpath(gfarm_path)

    p = await async_gfreg(env, gfarm_path)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(p, elist))
    try:
        async for chunk in request.stream():
            # print(f"chunk={str(chunk)}")
            # print(f"chunk len={len(chunk)}")
            p.stdin.write(chunk)
            await p.stdin.drain()  # speedup
    except Exception as e:
        print(f"{str(e)}")  # TODO log
        raise HTTPException(
            status_code=500,
            detail=f"Cannot write: path={gfarm_path},"
            f" error={str(e)}, stderr={str(elist)}"
        )
    p.stdin.close()
    await stderr_task
    return_code = await p.wait()
    if return_code != 0:
        print(f"return_code={return_code}")  # TODO log
        raise HTTPException(
            status_code=500,
            detail=f"Cannot write: path={gfarm_path}, {str(elist)}"
        )
    return Response(status_code=200)
