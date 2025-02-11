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
import gzip
import bz2
import urllib
import random
import string
from datetime import datetime

import requests

from pydantic import BaseModel

from fastapi import FastAPI, Header, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth

from cryptography.fernet import Fernet

# https://github.com/mpdavis/python-jose/blob/master/jose/jwt.py
from jose import jwt


def str2bool(s):
    return s.lower() in ("1", "true", "on", "enable")

##### Parameters

# TODO environment variables

origins = [
    "http://localhost:3000",
    "http://c2:8000",
]

# ex. openssl rand -base64 32
SESSION_SECRET = "qU70WDyIpXdSOT9/7l0hICy0597EPRs/aPb5Mj5Xniw="
# In default, session in cookie is not encrypted
ENCRYPT_SESSION = True
# For token, the compression ratio of gzip is higher than bz2)
COMPRESS_TOKEN_TYPE = "gzip"  # gzip or bz2

# add this URL to "Valid redirect URIs" of OIDC_CLIENT_ID in Keyclaok

# not work: http://keycloak
# gfmd[]: <err> [1005366]
# SASL: xoauth2_plugin: introspect_token #012 Issuer URL must be HTTPS
# OIDC_SERVER = os.environ.get("OIDC_SERVER", "http://keycloak:8080")
OIDC_SERVER = os.environ.get("OIDC_SERVER", "https://keycloak:8443")
OIDC_REALM = os.environ.get("OIDC_REALM", "HPCI")
OIDC_CLIENT_ID = os.environ.get("OIDC_CLIENT_ID", "hpci-jwt-server")
OIDC_CLIENT_SECRET = os.environ.get("OIDC_CLIENT_SECRET",
                                    "eJxl5z1EHU0u6BVLpR5MG0v4NLgCZWWG")
# for Keycloak
REALM_URL = f"{OIDC_SERVER}/auth/realms/{OIDC_REALM}"
OIDC_META_URL = f"{REALM_URL}/.well-known/openid-configuration"
OIDC_CERTS_URL = f"{REALM_URL}/protocol/openid-connect/certs"
OIDC_LOGOUT_URL = f"{REALM_URL}/protocol/openid-connect/logout"

VERIFY_TOKEN = True
# VERIFY_TOKEN = False

TOKEN_MIN_VALID_TIME_REMAINING = 60  # sec.

# AUDIENCE = None
AUDIENCE = "hpci"
# ISSUER = None
ISSUER = "https://keycloak:8443/auth/realms/HPCI"

USER_CLAIM = "hpci.id" # TODO log username

VERIFY_CERT = False  # not verify certificate  # TODO True

GFARM_SASL_MECHANISMS = os.environ.get("GFARM_SASL_MECHANISMS")
ALLOW_GFARM_ANONYMOUS = str2bool(os.environ.get("ALLOW_GFARM_ANONYMOUS", "disable"))

#############################################################################
api_path = os.path.abspath(__file__)
api_dir = os.path.dirname(api_path)
top_dir = os.path.dirname(api_dir)

app = FastAPI()

if ENCRYPT_SESSION:
    # fer = Fernet(Fernet.generate_key())
    fer = Fernet(SESSION_SECRET)
else:
    fer = None

templates = Jinja2Templates(directory="templates")

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

oauth = OAuth()
oauth.register(
    name="my_oidc_provider",
    server_metadata_url=OIDC_META_URL,
    client_id=OIDC_CLIENT_ID,
    client_secret=OIDC_CLIENT_SECRET,
    client_kwargs={
        # 'scope': 'hpci',
        'verify': VERIFY_CERT,
    },
)
provider = oauth.my_oidc_provider


def compress_str_gzip(input_str):
    return gzip.compress(input_str.encode())


def decompress_str_gzip(input_bin):
    return gzip.decompress(input_bin).decode()


def compress_str_bz2(input_str):
    return bz2.compress(input_str.encode())


def decompress_str_bz2(input_bin):
    return bz2.decompress(input_bin).decode()


if COMPRESS_TOKEN_TYPE == 'bz2':
    compress_str = compress_str_bz2
    decompress_str = decompress_str_bz2
else:
    compress_str = compress_str_gzip
    decompress_str = decompress_str_gzip


def encrypt_token(token):
    # dict -> JSON str
    s = json.dumps(token)
    # JSON str -> JSON bin (compressed)
    cb = compress_str(s)
    # JSON bin (compressed) -> encrypted bin
    eb = fer.encrypt(cb)
    # encrypted bin -> base85 str
    encrypted_token = base64.b85encode(eb).decode()
    #print(f"len: before={len(s)}, after={len(encrypted_token)}")
    return encrypted_token


def decrypt_token(encrypted_token):
    try:
        # base85 str -> encrypted bin
        eb = base64.b85decode(encrypted_token)
        # encrypted bin -> JSON bin (compressed)
        cb = fer.decrypt(eb)
        # JSON bin (compressed) -> JSON str
        s = decompress_str(cb)
        # JSON str -> dict
        return json.loads(s)
    except Exception as e:
        print("decrypt_token error: " + str(e))  #TODO log
        return None


def set_token(request: Request, token):
    if fer:
        token = encrypt_token(token)
    #print(f"set token: {token}")  # TODO
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
        response = requests.post(token_endpoint_url,
                                 data=data, verify=VERIFY_CERT)
        response.raise_for_status()
        new_token = response.json()
        set_token(request, new_token)
        return new_token
    except requests.exceptions.RequestException:
        raise


def jwt_error(msg):
    return HTTPException(status_code=500,
                         detail=f"JWT error: {msg}")


def verify_token(token, use_raise=False):
    try:
        access_token = token.get("access_token")
        # TODO cache jwks, cache timeout
        jwks = requests.get(OIDC_CERTS_URL, verify=VERIFY_CERT).json()
        #print(pf(jwks)) #TODO
        header = jwt.get_unverified_header(access_token)
        #print(pf(header)) #TODO
        if not header:
            raise jwt_error("Invalid header")
        alg = header.get("alg")
        options = {'leeway': -TOKEN_MIN_VALID_TIME_REMAINING}
        claims = jwt.decode(
            access_token,
            jwks,
            algorithms=alg,
            audience=AUDIENCE,
            issuer=ISSUER,
            options=options,
        )
        return claims
    except Exception as e:
        print(f"Access token verification error: {e}")  # TODO log debug
        if use_raise:
            raise
        return None


def is_expired_token(token, use_raise=False):
    if VERIFY_TOKEN:
        claims = verify_token(token, use_raise)
        if not claims:
            return True  # expired
        #print(pf(claims)) #TODO
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
        return (current_time + TOKEN_MIN_VALID_TIME_REMAINING) > exp
    except Exception as e:
        print(f"is_expired_token: " + str(e))
        return True  # expired


async def get_token(request: Request):
    token = request.session.get("token")
    if not token:
        return None
    if fer:
        token = decrypt_token(token)
        if not token:
            return None
    if not is_expired_token(token):
        return token
    new_token = await use_refresh_token(request, token)
    if not is_expired_token(new_token, use_raise=True):
        return new_token
    return None  # not login


def delete_token(request: Request):
    request.session.pop("token", None)


async def get_access_token(request: Request) -> Optional[str]:
    token = await get_token(request)
    if token:
        # print("token from session: " + str(token))  # TODO
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
    login_ok = False
    error = ""
    sasl_username = ""
    try:
        access_token = await get_access_token(request)
        if access_token:
            login_ok = True
    except Exception as e:
        access_token = None
        error = f"Access token verification error: {str(e)}"

    if access_token is None and error == "":
        user, passwd = get_user_passwd(request)
        if user and passwd:
            login_ok = True
            sasl_username = user

    if login_ok:
        if access_token:
            pat = parse_access_token(access_token)
            csrf_token = gen_csrf(request)
            redirect_uri = request.url_for("logout")
            # for Keycloak 19 or later ?
            logout_url = OIDC_LOGOUT_URL + "?client_id=" + OIDC_CLIENT_ID + "&post_logout_redirect_uri=" + str(redirect_uri) + "&state=" + csrf_token
            claims = jwt.get_unverified_claims(access_token)
            exp = claims.get("exp")
        else:
            pat = ""
            logout_url = ""
            exp = -1
    else:
        pat = ""
        logout_url = ""
        exp = -1
    logout_url_simple = OIDC_LOGOUT_URL
    current_time = int(time.time())
    return templates.TemplateResponse("index.html",
                                      {"request": request,
                                       "error": error,
                                       "login_ok": login_ok,
                                       "access_token": access_token,
                                       "parsed_at": pat,
                                       "sasl_username": sasl_username,
                                       "logout_url": logout_url,
                                       "logout_url_simple": logout_url_simple,
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
    print(str(token))  # TODO log 
    delete_user_passwd(request)
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
    delete_user_passwd(request)
    return RedirectResponse(url="/")


@app.get("/access_token")
async def access_token(request: Request):
    access_token = await get_access_token(request)
    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Not logged in"
        )
    # return JSON
    return {"access_token": access_token}


def get_user_passwd(request):
    username = request.session.get("username")
    password = request.session.get("password")
    if username is None or password is None:
        return None, None
    if fer:
        #print("encrypted password:", password) #TODO
        b = base64.b85decode(password)
        password = fer.decrypt(b).decode()
    return username, password


def set_user_passwd(request, username, password):
    request.session["username"] = username
    if fer:
        b = fer.encrypt(password.encode())
        password = base64.b85encode(b).decode()
    request.session["password"] = password


def delete_user_passwd(request: Request):
    request.session.pop("username", None)
    request.session.pop("password", None)


@app.post("/login_passwd")
async def login_passwd(request: Request,
                       username: str = Form(),
                       password: str = Form()):
    delete_token(request)
    set_user_passwd(request, username, password)
    #TODO log username
    print(f"SASL login: {username}")
    env = await set_env(request, None)
    p = await async_gfwhoami(env)
    try:
        await gfarm_command_standard_response(p, "gfwhoami")
    except Exception:
        delete_user_passwd(request)
        raise
    return RedirectResponse(url="/", status_code=303)


#############################################################################
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
        if not ALLOW_GFARM_ANONYMOUS:
            raise no_authz
    return authz_type, user, passwd


async def set_env(request, authorization):
    env = {'PATH': os.environ['PATH']}

    # prefer session
    # get access token from session in cookie
    access_token = await get_access_token(request)
    if access_token:
        authz_type = AUTHZ_TYPE_BEARER
    else:
        # get password from session in cookie
        user, passwd = get_user_passwd(request)
        if user and passwd:
            authz_type = AUTHZ_TYPE_BASIC
        elif authorization:
            # get access token or password from Authorization header
            # print(f"authorization={authorization}")
            authz_type, user, passwd = parse_authorization(authorization)
            access_token = passwd
        else:
            authz_type = None

    if authz_type == AUTHZ_TYPE_BEARER:
        env.update({
            # In libgfarm, GFARM_SASL_PASSWORD is preferentially
            # used over JWT_USER_PATH
            'GFARM_SASL_PASSWORD': access_token,
            # for old libgfarm (Gfarm 2.8.5 or earlier)
            'JWT_USER_PATH': f'!/{top_dir}/bin/GFARM_SASL_PASSWORD_STDOUT.sh',
            # for Gfarm 2.8.6 or later
            'GFARM_SASL_MECHANISMS': 'XOAUTH2',
        })
    elif authz_type == AUTHZ_TYPE_BASIC:
        env.update({
            # for Gfarm 2.8.6 or later
            'GFARM_SASL_USER': user,
            'GFARM_SASL_PASSWORD': passwd,
        })
        if GFARM_SASL_MECHANISMS:
            env.update({
                # for Gfarm 2.8.6 or later
                'GFARM_SASL_MECHANISMS': GFARM_SASL_MECHANISMS,
                })
    else:  # anonymous
        env.update({
            # for Gfarm 2.8.6 or later
            'GFARM_SASL_MECHANISMS': 'ANONYMOUS',
            'GFARM_SASL_USER': 'anonymous',
        })

    return env


#############################################################################
def keyval(s):
  # s: "  Key1: Val1..."
  # return: "key1", "Val1..."
  kv = s.split(":", 1)
  if len(kv) == 2:
    key, val = kv
    key = key.strip()
    val = val.strip()
  else:
    key = None
    val = None
  return key, val


def timestamp_to_unix(timestamp_str):
  try:
    dt_object = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S.%f %z")
    unix_timestamp = dt_object.timestamp()
    return unix_timestamp
  except ValueError as e:
    print(f"Invalid timestamp format. {str(e)}") #TODO log
    return None


class Stat(BaseModel):
    File: str
    Filetype: str
    Size: int
    Uid: str
    Gid: str
    Mode: str
    Gen: int
    Inode: int
    Ncopy: int
    Links: int
    AccessSecound: float
    Access: str
    ModifySecound: float
    Modify: str
    ChangeSecound: float
    Change: str
    MetadataHost: str
    MetadataPort: str
    MetadataUser: str

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "File": "/tmp",
                    "Filetype": "directory",
                    "Size": 0,
                    "Uid": "user1",
                    "Gid": "gfarmadm",
                    "Mode": "1777",
                    "Gen": 0,
                    "Inode": 3,
                    "Ncopy": 1,
                    "Links": 2,
                    "AccessSecound": 1739212053.191688,
                    "Access": "2025-02-10 18:27:33.191688 +0000",
                    "ModifySecound": 1739212051.07112,
                    "Modify": "2025-02-10 18:27:31.071120 +0000",
                    "ChangeSecound": 1739178909.4,
                    "Change": "2025-02-10 18:15:09.400000 +0900",
                    "MetadataHost": "gfmd1",
                    "MetadataPort": "601",
                    "MetadataUser": "user1"
                }
            ]
        }


def parse_gfstat(file_info_str):
  file_info = {
      "MetadataHost": "",
      "MetadataPort": "",
      "MetadataUser": "",
  }
  lines = file_info_str.splitlines()
  for line in lines:
    line = line.strip()
    if line:
      key, value = keyval(line)
      if key == "File":
        value = value.strip('"')
      elif key == "Size":
        # Size: 0             Filetype: directory
        value, ftype = value.split(" ", 1)
        value = int(value)
        # Filetype: directory
        ftype_key, ftype_val = keyval(ftype)
        file_info[ftype_key] = ftype_val
      elif key == "Mode":
        # Mode: (1777)        Uid: ( user1)  Gid: (gfarmadm)
        value = value.replace("(", "").replace(")", "")
        # Mode: 1777        Uid:  user1  Gid: gfarmadm
        value, ug = value.split(None, 1)
        # Uid: user1  Gid: gfarmadm
        uid_key, ug_val = keyval(ug)
        # user1  Gid: gfarmadm
        uid_val, g = ug_val.split(None, 1)
        file_info[uid_key] = uid_val
        gid_key, gid_val = keyval(g)
        file_info[gid_key] = gid_val
      elif key == "Inode":
        # Inode: 3            Gen: 0
        value, gen = value.split(" ", 1)
        value = int(value)
        # Gen: 0
        gen_key, gen_val = keyval(gen)
        file_info[gen_key] = int(gen_val)
      elif key == "Links":
        # Links: 2            Ncopy: 1
        value, ncopy = value.split(" ", 1)
        value = int(value)
        # Ncopy: 1
        ncopy_key, ncopy_val = keyval(ncopy)
        file_info[ncopy_key] = int(ncopy_val)
      elif key in ("Access", "Modify", "Change"):
        # 2025-02-10 18:27:33.191688265 +0000
        t = value.split()
        if len(t) == 3:
          day = t[0]
          sec, nsec = t[1].split(".")
          usec = nsec[:6]  # 191688265 -> 191688
          zone = t[2]
          value = f"{day} {sec}.{usec} {zone}"
        value_sec = timestamp_to_unix(value)
        file_info[key+"Secound"] = value_sec
      elif key is None:
        continue
      file_info[key] = value

  return Stat.parse_obj(file_info)


# Example
# file_info_str = """
#  File: "/tmp"
#  Size: 0             Filetype: directory
#  Mode: (1777)        Uid: ( user1)  Gid: (gfarmadm)
#  Inode: 3            Gen: 0
#                      (00000000000000030000000000000000)
#  Links: 2            Ncopy: 1
#  Access: 2025-02-10 18:27:33.191688265 +0000
#  Modify: 2025-02-10 18:27:31.071120060 +0000
#  Change: 2025-02-10 18:15:09.400000000 +0900
#  MetadataHost: gfmd1
#  MetadataPort: 601
#  MetadataUser: user1
# """
# print(str(parse_gfstat(file_info_str)))


#############################################################################
async def async_gfwhoami(env):
    args = []
    return await asyncio.create_subprocess_exec(
        'gfwhoami', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def async_gfrm(env, path):
    args = [path]
    return await asyncio.create_subprocess_exec(
        'gfrm', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def async_gfmv(env, src, dest):
    args = [src, dest]
    return await asyncio.create_subprocess_exec(
        'gfmv', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def async_gfexport(env, path):
    args = [path]
    return await asyncio.create_subprocess_exec(
        'gfexport', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def async_gfreg(env, path, mtime):
    if mtime:
        args = ['-M', str(mtime)]
    else:
        args = []
    args += ['-', path]
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


async def async_gfmkdir(env, path):
    args = [path]
    return await asyncio.create_subprocess_exec(
        'gfmkdir', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def async_gfrmdir(env, path):
    args = [path]
    return await asyncio.create_subprocess_exec(
        'gfrmdir', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def async_gfstat(env, path, metadata):
    if metadata:
        args = ['-M', path]
    else:
        args = [path]
    return await asyncio.create_subprocess_exec(
        'gfstat', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


# # SEE ALSO: gfptar
# PAT_ENTRY = re.compile(r'^\s*(\d+)\s+([-dl]\S+)\s+(\d+)\s+(\S+)\s+(\S+)\s+'
#                        r'(\d+)\s+(\S+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+(.+)$')
# async def async_size(env, path):
#     args = ['-ilTd', path]
#     p = await asyncio.create_subprocess_exec(
#         'gfls', *args,
#         env=env,
#         stdin=asyncio.subprocess.DEVNULL,
#         stdout=asyncio.subprocess.PIPE,
#         stderr=asyncio.subprocess.DEVNULL)
#     line = await p.stdout.readline()
#     return_code = await p.wait()
#     if return_code != 0:
#         existing = False
#         is_file = False
#         size = 0
#         return existing, is_file, size
#     line = line.decode().rstrip()
#     #print(line)  #TODO
#     m = PAT_ENTRY.match(line)
#     if m:
#         # Ex.
#         # 12345 -rw-rw-r-- 1 user1 group1 29 Jan 1 00:00:00 2022 fname
#         # inum = int(m.group(1))
#         mode_str = m.group(2)
#         # nlink = int(m.group(3))
#         # uname = m.group(4)
#         # gname = m.group(5)
#         size = int(m.group(6))
#         # mtime_str = m.group(7)
#         # name = m.group(8)
#     else:
#         mode_str = "?"
#         size = -1

#     existing = True
#     is_file = mode_str[0] == '-'
#     return existing, is_file, size

async def async_size(env, path):
    metadata = False
    proc = await async_gfstat(env, path, metadata)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(proc, elist))
    data = await proc.stdout.read()
    stdout = data.decode()
    await stderr_task
    return_code = await proc.wait()
    if return_code != 0:
        existing = False
        is_file = False
        size = 0
    else:
        st = parse_gfstat(stdout)
        print(st)
        existing = True
        is_file = (st.Filetype == "regular file")
        size = st.Size
    return existing, is_file, size


#############################################################################
async def log_stderr(process: asyncio.subprocess.Process, elist: list) -> None:
    while True:
        line = await process.stderr.readline()
        if line:
            msg = line.decode().strip()
            print(f"STDERR: {msg}")  # TODO debug log
            elist.append(msg)
        else:
            break


def gfarm_http_error(command, code, message, stdout, elist):
    detail = {
        "command": command,
        "message": message,
        "stdout": stdout,
        "stderr": elist,
    }
    return HTTPException(
        status_code=code,
        detail=detail,
    )


async def gfarm_command_standard_response(proc, command):
    elist = []
    stderr_task = asyncio.create_task(log_stderr(proc, elist))
    data = await proc.stdout.read()
    stdout = data.decode()
    await stderr_task
    return_code = await proc.wait()
    if return_code != 0:
        print(f"return_code={return_code}")  # TODO log
        errstr = str(elist)
        print(errstr) #TODO
        if "authentication error" in errstr:
            code = 401
            message = "Authentication error"
            raise gfarm_http_error(command, code, message, stdout, elist)
        else:
            code = 500
            message = "Error"
            raise gfarm_http_error(command, code, message, stdout, elist)
    return PlainTextResponse(content=stdout)


#############################################################################
@app.get("/c/me")
@app.get("/conf/me")
@app.get("/config/me")
async def whoami(request: Request,
                 authorization: Union[str, None] = Header(default=None)):
    env = await set_env(request, authorization)
    p = await async_gfwhoami(env)
    return await gfarm_command_standard_response(p, "gfwhoami")


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
    return PlainTextResponse(content=s)


@app.put("/d/{gfarm_path:path}")
@app.put("/dir/{gfarm_path:path}")
@app.put("/directories/{gfarm_path:path}")
async def dir_create(gfarm_path: str,
                     request: Request,
                     authorization: Union[str, None] = Header(default=None)):
    gfarm_path = fullpath(gfarm_path)

    env = await set_env(request, authorization)
    p = await async_gfmkdir(env, gfarm_path)
    return await gfarm_command_standard_response(p, "gfmkdir")


@app.delete("/d/{gfarm_path:path}")
@app.delete("/dir/{gfarm_path:path}")
@app.delete("/directories/{gfarm_path:path}")
async def dir_remove(gfarm_path: str,
                     request: Request,
                     authorization: Union[str, None] = Header(default=None)):
    gfarm_path = fullpath(gfarm_path)

    env = await set_env(request, authorization)
    p = await async_gfrmdir(env, gfarm_path)
    return await gfarm_command_standard_response(p, "gfrmdir")


# BUFSIZE = 1
# BUFSIZE = 65536
BUFSIZE = 1024 * 1024


@app.get("/f/{gfarm_path:path}")
@app.get("/file/{gfarm_path:path}")
@app.get("/files/{gfarm_path:path}")
async def file_export(gfarm_path: str,
                      request: Request,
                      action: str = 'view',
                      authorization: Union[str, None] = Header(default=None)):
    gfarm_path = fullpath(gfarm_path)
    # print(gfarm_path)

    env = await set_env(request, authorization)
    existing, is_file, size = await async_size(env, gfarm_path)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="The requested URL does not exist."
        )
    if not is_file:
        raise HTTPException(
            status_code=415,
            detail="The requested URL does not represent a file."
        )

    if int(size) <= 0:
        return Response(status_code=204)

    env = await set_env(request, authorization)
    p = await async_gfexport(env, gfarm_path)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(p, elist))

    # size > 0
    first_byte = await p.stdout.read(1)
    if not first_byte:
        await stderr_task
        raise HTTPException(
            status_code=500,
            detail=f"Cannot read: path={gfarm_path}, stderr={str(elist)}"
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
    headers = {"content-length": cl}
    if action == 'download':
        filename = os.path.basename(gfarm_path)
        encoded = urllib.parse.quote(filename, encoding='utf-8')
        # RFC 5987,8187
        cd = f"attachment; filename*=UTF-8' '\"{encoded}\""
        #cd = f"attachment; filename=\"{encoded}\""
        headers.update({"content-disposition": cd})
    return StreamingResponse(content=generate(),
                             media_type=ct,
                             headers=headers,
                             )


@app.put("/f/{gfarm_path:path}")
@app.put("/file/{gfarm_path:path}")
@app.put("/files/{gfarm_path:path}")
async def file_import(gfarm_path: str,
                      request: Request,
                      authorization: Union[str, None] = Header(default=None),
                      x_file_timestamp: Union[str, None] = Header(default=None)):
    # print("x_file_timestamp=" + str(x_file_timestamp)) #TODO debug
    gfarm_path = fullpath(gfarm_path)

    randstr = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    tmpname = "gfarm-http-gateway.upload." + randstr
    tmppath = os.path.join(os.path.dirname(gfarm_path), tmpname)

    env = await set_env(request, authorization)
    p = await async_gfreg(env, tmppath, x_file_timestamp)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(p, elist))
    error = None
    try:
        async for chunk in request.stream():
            # print(f"chunk={str(chunk)}")
            # print(f"chunk len={len(chunk)}")
            p.stdin.write(chunk)
            await p.stdin.drain()  # speedup
    except Exception as e:
        error = e

    p.stdin.close()
    await stderr_task
    return_code = await p.wait()

    if return_code == 0 and error is None:
        env = await set_env(request, authorization)
        p2 = await async_gfmv(env, tmppath, gfarm_path)
        stderr_task2 = asyncio.create_task(log_stderr(p2, elist))
        await stderr_task2
        return_code = await p2.wait()
        if return_code == 0:
            return Response(status_code=200)

    # error case
    print(f"remove tmpfile: {tmppath}")  #TODO
    env = await set_env(request, authorization)
    p3 = await async_gfrm(env, tmppath)
    stderr_task3 = asyncio.create_task(log_stderr(p3, elist))
    await stderr_task3
    await p3.wait()

    command = "gfreg"
    code = 500
    if error:
        message = f"IO error({str(error)}): path={gfarm_path}"
    else:
        message = f"gfreg error: path={gfarm_path}"
    stdout = ""
    raise gfarm_http_error(command, code, message, stdout, elist)


@app.delete("/f/{gfarm_path:path}")
@app.delete("/file/{gfarm_path:path}")
@app.delete("/files/{gfarm_path:path}")
async def file_remove(gfarm_path: str,
                      request: Request,
                      authorization: Union[str, None] = Header(default=None)):
    gfarm_path = fullpath(gfarm_path)

    env = await set_env(request, authorization)
    p = await async_gfrm(env, gfarm_path)
    return await gfarm_command_standard_response(p, "gfrm")


class Move(BaseModel):
    source: str
    destination: str
    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "source": "/tmp/testfile1",
                    "destination": "/tmp/testfile2",
                }
            ]
        }


@app.post("/move")
async def move_rename(request: Request,
                      move_data: Move,
                      authorization: Union[str, None] = Header(default=None)):
    src = move_data.source
    dest = move_data.destination

    env = await set_env(request, authorization)
    p = await async_gfmv(env, src, dest)
    return await gfarm_command_standard_response(p, "gfmv")


@app.get("/a/{gfarm_path:path}")
@app.get("/attr/{gfarm_path:path}")
@app.get("/attributes/{gfarm_path:path}")
async def stat(gfarm_path: str,
               request: Request,
               authorization: Union[str, None] = Header(default=None)) -> Stat:
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    metadata = True
    proc = await async_gfstat(env, gfarm_path, metadata)

    elist = []
    stderr_task = asyncio.create_task(log_stderr(proc, elist))
    data = await proc.stdout.read()
    stdout = data.decode()
    await stderr_task
    return_code = await proc.wait()
    if return_code != 0:
        errstr = str(elist)
        command = "gfstat"
        if "authentication error" in errstr:
            code = 401
            message = "Authentication error"
            raise gfarm_http_error(command, code, message, stdout, elist)
        else:
            code = 500
            message = "Error"
            raise gfarm_http_error(command, code, message, stdout, elist)
    return parse_gfstat(stdout)
