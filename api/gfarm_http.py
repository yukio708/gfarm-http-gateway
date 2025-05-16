import asyncio
import base64
import bz2
from datetime import datetime
import gzip
import json
import logging
import mimetypes
import os
from pprint import pformat as pf
import random
import string
import time
import types
import secrets
import shlex
import subprocess
import sys
from typing import List, Union, Optional
import urllib
import re
import tempfile
import shutil

from loguru import logger

import httpx
import requests

from pydantic import BaseModel

from authlib.integrations.starlette_client import OAuth
from fastapi import (FastAPI, Query, Header, HTTPException, Request,
                     Form, status)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import (PlainTextResponse,
                               StreamingResponse,
                               Response,
                               HTMLResponse,
                               RedirectResponse,
                               JSONResponse)
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from cryptography.fernet import Fernet

import zipfile
import zipstream

# https://github.com/mpdavis/python-jose/blob/master/jose/jwt.py
from jose import jwt


def exit_error():
    logger.error("Exit (error)")
    sys.exit(1)

# Ex. -rw-rw-r-- 1 user1  gfarmadm     29 Jan  1 00:00:00 2022 fname
PAT_ENTRY2 = re.compile(r'^([-dl]\S+)\s+(\d+)\s+(\S+)\s+(\S+)\s+'
                        r'(\d+)\s+(\S+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+(.+)$')

TMPDIR = "/tmp/gfarm-http"

#############################################################################
# Configuration variables

CONFIG_KEY_PREFIX = "GFARM_HTTP_"


def str2bool(s):
    if isinstance(s, bool):
        return s
    return s.lower() in ("1", "yes", "true", "on", "enable")


def str2list(s):
    return s.split(",")


def str2none(s):
    if not s:  # "" or None or False or not 0
        return None
    if not isinstance(s, str):
        return None
    if s.lower() == "none":
        return None
    return s


def load_config_from_file(fpath):
    data = {}
    prefix = CONFIG_KEY_PREFIX
    with open(fpath, 'r') as f:
        for line in f:
            line = line.strip()
            if line and "=" in line:
                key, value = line.split("=", 1)
                if not key.startswith(prefix):
                    continue
                try:
                    # Convert:
                    #    "VALUE" # comment
                    # -> VALUE
                    value = shlex.split(f'{value}')[0]
                except Exception:
                    pass
                data[key] = value
    return data


def load_config_from_env():
    config = {}
    prefix = CONFIG_KEY_PREFIX
    for key, value in os.environ.items():
        if key.startswith(prefix):
            config[key] = value
    return config


def validate_conf(data, required_keys):
    last_err = None
    for key in required_keys:
        if key not in data:
            last_err = f"REQUIRED: {key}"
            logger.error(last_err)
    if last_err:
        exit_error()
        # raise ValueError(last_err)


def format_conf(data, required_keys):
    for key in required_keys:
        val = data[key]
        newval = val.format(**data)
        data[key] = newval


conf_required_keys = [
    "GFARM_HTTP_DEBUG",
    "GFARM_HTTP_GFARM_CONFIG_FILE",
    "GFARM_HTTP_ORIGINS",
    "GFARM_HTTP_SESSION_SECRET",
    "GFARM_HTTP_SESSION_ENCRYPT",
    "GFARM_HTTP_SESSION_COMPRESS_TYPE",
    # "GFARM_HTTP_KEYCLOAK_SERVER",  # optional
    # "GFARM_HTTP_KEYCLOAK_REALM",   # optional
    "GFARM_HTTP_OIDC_REDIRECT_URI_PAGE",
    "GFARM_HTTP_OIDC_OVERRIDE_REDIRECT_URI",
    "GFARM_HTTP_OIDC_CLIENT_ID",
    "GFARM_HTTP_OIDC_CLIENT_SECRET",
    "GFARM_HTTP_OIDC_BASE_URL",
    "GFARM_HTTP_OIDC_META_URL",
    "GFARM_HTTP_OIDC_KEYS_URL",
    "GFARM_HTTP_OIDC_LOGOUT_URL",
    "GFARM_HTTP_TOKEN_VERIFY",
    "GFARM_HTTP_TOKEN_MIN_VALID_TIME_REMAINING",
    "GFARM_HTTP_TOKEN_AUDIENCE",
    "GFARM_HTTP_TOKEN_ISSUERS",
    "GFARM_HTTP_TOKEN_USER_CLAIM",
    "GFARM_HTTP_VERIFY_CERT",
    "GFARM_HTTP_SASL_MECHANISM_FOR_PASSWORD",
    "GFARM_HTTP_ALLOW_ANONYMOUS",
    "GFARM_HTTP_ASYNC_GFEXPORT",
]

# default parameters
default_dict = load_config_from_file("api/default.conf")

conf_file = os.environ.get("GFARM_HTTP_CONFIG_FILE", "gfarm-http.conf")
if os.path.exists(conf_file):
    conf_dict = load_config_from_file(conf_file)
else:
    conf_dict = {}

env_dict = load_config_from_env()

merged_dict = default_dict
merged_dict.update(conf_dict)
merged_dict.update(env_dict)
validate_conf(merged_dict, conf_required_keys)
format_conf(merged_dict, conf_required_keys)
conf = types.SimpleNamespace(**merged_dict)

del env_dict
del conf_dict
del merged_dict

GFARM_HTTP_DEBUG = str2bool(conf.GFARM_HTTP_DEBUG)
GFARM_CONFIG_FILE = str2none(conf.GFARM_HTTP_GFARM_CONFIG_FILE)

ORIGINS = str2list(conf.GFARM_HTTP_ORIGINS)

# ex. openssl rand -base64 32
SESSION_SECRET = conf.GFARM_HTTP_SESSION_SECRET

# NOTE: In default, session in cookie is not encrypted
SESSION_ENCRYPT = str2bool(conf.GFARM_HTTP_SESSION_ENCRYPT)

# gzip or bz2
# NOTE: For token, the compression ratio of gzip is higher than bz2
SESSION_COMPRESS_TYPE = conf.GFARM_HTTP_SESSION_COMPRESS_TYPE

OIDC_REDIRECT_URI_PAGE = conf.GFARM_HTTP_OIDC_REDIRECT_URI_PAGE
OIDC_OVERRIDE_REDIRECT_URI = conf.GFARM_HTTP_OIDC_OVERRIDE_REDIRECT_URI

OIDC_CLIENT_ID = conf.GFARM_HTTP_OIDC_CLIENT_ID
OIDC_CLIENT_SECRET = str2none(conf.GFARM_HTTP_OIDC_CLIENT_SECRET)

# OIDC_BASE_URL = conf.GFARM_HTTP_OIDC_BASE_URL

OIDC_META_URL = conf.GFARM_HTTP_OIDC_META_URL

OIDC_KEYS_URL = str2none(conf.GFARM_HTTP_OIDC_KEYS_URL)
OIDC_LOGOUT_URL = str2none(conf.GFARM_HTTP_OIDC_LOGOUT_URL)

TOKEN_VERIFY = conf.GFARM_HTTP_TOKEN_VERIFY
# sec.
min_valid_time = conf.GFARM_HTTP_TOKEN_MIN_VALID_TIME_REMAINING
TOKEN_MIN_VALID_TIME_REMAINING = int(min_valid_time)
del min_valid_time

TOKEN_AUDIENCE = str2none(conf.GFARM_HTTP_TOKEN_AUDIENCE)

TOKEN_ISSUERS = str2none(conf.GFARM_HTTP_TOKEN_ISSUERS)
if TOKEN_ISSUERS:
    TOKEN_ISSUERS = str2list(TOKEN_ISSUERS)

TOKEN_USER_CLAIM = conf.GFARM_HTTP_TOKEN_USER_CLAIM
VERIFY_CERT = str2bool(conf.GFARM_HTTP_VERIFY_CERT)
SASL_MECHANISM_FOR_PASSWORD = conf.GFARM_HTTP_SASL_MECHANISM_FOR_PASSWORD
ALLOW_ANONYMOUS = str2bool(conf.GFARM_HTTP_ALLOW_ANONYMOUS)


def conf_check_not_recommended():
    if not SESSION_ENCRYPT:
        logger.warning("NOT RECOMMENDED: GFARM_HTTP_SESSION_ENCRYPT=no")
    if not VERIFY_CERT:
        logger.warning("NOT RECOMMENDED: GFARM_HTTP_VERIFY_CERT=no")
        # shut up warning:
        #   InsecureRequestWarning: Unverified HTTPS request is being made
        #   to host 'HOSTNAME'. Adding certificate verification is strongly
        #   advised.
        #   See: https://urllib3.readthedocs.io/en/latest/advanced-usage.html#tls-warnings  # noqa: E501
        requests.packages.urllib3.disable_warnings()


def conf_check_invalid():
    error = False
    if OIDC_REDIRECT_URI_PAGE != "index" \
       and OIDC_REDIRECT_URI_PAGE != "auth":
        logger.error("INVALID: GFARM_HTTP_OIDC_REDIRECT_URI_PAGE")
        error = True
    if error:
        exit_error()


#############################################################################
# logging
# using loguru: https://github.com/Delgan/loguru
# See: https://github.com/fastapi/fastapi/discussions/7533


class InterceptHandler(logging.Handler):
    # See: https://loguru.readthedocs.io/en/stable/overview.html#entirely-compatible-with-standard-logging  # noqa: E501

    def emit(self, record):
        # Get corresponding Loguru level if it exists.
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message.
        frame, depth = logging.currentframe(), 0
        while frame and (depth == 0
                         or frame.f_code.co_filename == logging.__file__):
            frame = frame.f_back
            depth += 1
            # print(depth, frame.f_code.co_filename)
        # print(depth, frame.f_code.co_filename)
        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


# See: https://loguru.readthedocs.io/en/stable/api/logger.html#loguru._logger.Logger.add  # noqa: E501
# default format: '<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>'  # noqa: E501
# LOGURU_FORMAT environment variable to change the format:
#   ex. LOGURU_FORMAT="<level>{level}</level>: <level>{message}</level>"

# NOTE: log payload
# from loguru._defaults import LOGURU_FORMAT
#
# def format_record(record: dict) -> str:
#     format_string = LOGURU_FORMAT
#     if record["extra"].get("payload") is not None:
#         record["extra"]["payload"] = pf(
#             record["extra"]["payload"], indent=4, compact=True, width=88
#         )
#         format_string += "\n<level>{extra[payload]}</level>"
#     format_string += "{exception}\n"
#     return format_string

# set format for uvicorn
# See: https://github.com/encode/uvicorn/blob/master/uvicorn/config.py
#   (uvicorn loggers: .error .access .asgi)
logger_uvicorn_access = logging.getLogger("uvicorn.access")
logger_uvicorn_access.handlers = [InterceptHandler()]

if GFARM_HTTP_DEBUG:
    DEBUG = True
    loglevel = logging.DEBUG
    logger_uvicorn_access.setLevel(loglevel)
else:
    loglevel = logger_uvicorn_access.getEffectiveLevel()
    DEBUG = loglevel == logging.DEBUG

logger_uvicorn = logging.getLogger("uvicorn")
logger_uvicorn.setLevel(loglevel)
logger_uvicorn.handlers = [InterceptHandler()]

# not change (duplicated messges are printed)
# logger_uvicorn_error = logging.getLogger("uvicorn.error")
# logger_uvicorn_error.setLevel(loglevel)
# logger_uvicorn_error.handlers = [InterceptHandler()]

# set format for root logger
root_logger = logging.getLogger()
root_logger.setLevel(loglevel)
root_logger.handlers = [InterceptHandler()]

if not DEBUG:
    # hide httpx.client messages
    httpx_logger = logging.getLogger("httpx")
    fltr = logging.Filter("httpx.client")
    httpx_logger.addFilter(fltr)

# set format for loguru
# See: https://loguru.readthedocs.io/en/stable/api/logger.html#loguru._logger.Logger.configure  # noqa: E501
loguru_handler = {"sink": sys.stdout, "level": loglevel}
# loguru_handler.update({"format": format_record})
loguru_handlers = [loguru_handler]
logger.configure(handlers=loguru_handlers)

# Examples
#   logger.info("loguru log")
#   logging.info("logging log")
#   logger.bind(payload=dict(request.query_params)).debug("params")  # noqa: E501


def log_operation(env, opname, args):
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    logger.opt(depth=1).info(
        f"{ipaddr}:0 user={user}, cmd={opname}, args={str(args)}")


def log_login(request, user, login_type):
    ipaddr = request.client.host
    logger.opt(depth=1).info(
        f"{ipaddr}:0 user={user}, login_auth_type={login_type}")


def log_login_error(request, user, login_type, error):
    ipaddr = request.client.host
    logger.opt(depth=1).error(
        f"{ipaddr}:0 user={user}, login_auth_type={login_type}, error={error}")


if DEBUG:
    logger.debug("config:\n" + pf(conf.__dict__))

conf_check_not_recommended()
conf_check_invalid()  # may exit

#############################################################################
def delete_tempfiles():
    if os.path.exists(TMPDIR): shutil.rmtree(TMPDIR)
delete_tempfiles()

#############################################################################
app = FastAPI()

api_path = os.path.abspath(__file__)
api_dir = os.path.dirname(api_path)
top_dir = os.path.dirname(api_dir)
bin_dir = f"{top_dir}/bin"

if SESSION_ENCRYPT:
    # fer = Fernet(Fernet.generate_key())
    fer = Fernet(SESSION_SECRET)
else:
    fer = None

templates = Jinja2Templates(directory="templates")

app.mount("/static", StaticFiles(directory="static"), name="static")

app.mount("/react", StaticFiles(directory="frontend/app/react-app/build", html=True), name="react")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    # allow_methods=["*"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# TODO GFARM_HTTP_SESSION_MAX_AGE
SESSION_MAX_AGE = 60 * 60 * 24  # 1 day

# https://www.starlette.io/middleware/#sessionmiddleware
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET,
                   same_site="lax",
                   max_age=SESSION_MAX_AGE)

# TODO disable OIDC authorization if OIDC_CLIENT_ID is None
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
metadata = None  # cached forever


async def oidc_metadata():
    global metadata
    if metadata is None:
        # cache
        metadata = await provider.load_server_metadata()
        if DEBUG:
            logger.debug("oidc_metadata:\n" + pf(metadata))
    return metadata


async def oidc_keys_url():
    if OIDC_KEYS_URL:
        return OIDC_KEYS_URL
    metadata = await oidc_metadata()
    jwks_uri = metadata.get("jwks_uri")
    if jwks_uri is None:
        logger.error("UNEXPECTED: jwks_uri is None")
    logger.debug(f"jwks_uri={jwks_uri}")
    return jwks_uri


async def oidc_logout_url():
    if OIDC_LOGOUT_URL:
        return OIDC_LOGOUT_URL
    metadata = await oidc_metadata()
    logout_url = metadata.get("end_session_endpoint")
    if logout_url is None:
        logger.error("UNEXPECTED: end_session_endpoint is None")
    logger.debug(f"logout_url(end_session_endpoint)={logout_url}")
    return logout_url


def compress_str_gzip(input_str):
    return gzip.compress(input_str.encode())


def decompress_str_gzip(input_bin):
    return gzip.decompress(input_bin).decode()


def compress_str_bz2(input_str):
    return bz2.compress(input_str.encode())


def decompress_str_bz2(input_bin):
    return bz2.decompress(input_bin).decode()


if SESSION_COMPRESS_TYPE == 'bz2':
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
    logger.debug(f"encrypt_token: str_len={len(s)},"
                 f" encrypted_len={len(encrypted_token)}")
    return encrypted_token


def decrypt_token(request, encrypted_token):
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
        ipaddr = get_client_ip_from_request(request)
        logger.warning(f"{ipaddr}:0 decrypt_token error=" + str(e))
        return None


def set_token(request: Request, token):
    if fer:
        token = encrypt_token(token)
    request.session["token"] = token


USE_HTTPX = True


async def http_post(url, data):
    if USE_HTTPX:
        async with httpx.AsyncClient(verify=VERIFY_CERT) as client:
            response = await client.post(url, data=data)
    else:
        response = requests.post(url, data=data, verify=VERIFY_CERT)
    return response


async def http_get(url):
    if USE_HTTPX:
        async with httpx.AsyncClient(verify=VERIFY_CERT) as client:
            response = await client.get(url)
    else:
        response = requests.get(url, verify=VERIFY_CERT)
    return response


async def use_refresh_token(request: Request, token):
    logger.debug("use_refresh_token is called")
    refresh_token = token.get("refresh_token")
    meta = await oidc_metadata()
    try:
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": OIDC_CLIENT_ID,
            "client_secret": OIDC_CLIENT_SECRET,
        }
        token_endpoint_url = meta.get('token_endpoint')
        response = await http_post(token_endpoint_url, data)
        response.raise_for_status()
        new_token = response.json()
        set_token(request, new_token)
        return new_token
    except httpx.HTTPError:
        raise
    except requests.exceptions.RequestException:
        raise


def jwt_error(msg):
    return HTTPException(status_code=500, detail=f"JWT error: {msg}")


jwks_cache = None
jwks_cache_time = None
jwks_cache_timeout = 600  # sec.


# caching jwks
async def oidc_jwks():
    global jwks_cache
    global jwks_cache_time
    now = int(time.time())
    if jwks_cache_time is None or now > jwks_cache_time + jwks_cache_timeout:
        # timeout
        jwks_cache_time = now
        jwks_url = await oidc_keys_url()
        response = await http_get(jwks_url)
        jwks_cache = response.json()
        return jwks_cache
    else:
        logger.debug("use cached jwks")
        return jwks_cache


async def verify_token(token, use_raise=False):
    try:
        access_token = token.get("access_token")
        jwks = await oidc_jwks()
        # if DEBUG:
        #     logger.debug("jwks=\n" + pf(jwks))
    except Exception:
        # logger.error(f"verify_token initialization error: {e}")
        logger.exception("verify_token initialization error")
        raise
    try:
        header = jwt.get_unverified_header(access_token)
        if not header:
            raise jwt_error("Invalid header")
        alg = header.get("alg")
        options = {'leeway': -TOKEN_MIN_VALID_TIME_REMAINING}
        claims = jwt.decode(
            access_token,
            jwks,
            algorithms=alg,
            audience=TOKEN_AUDIENCE,
            issuer=TOKEN_ISSUERS,
            options=options,
        )
        return claims
    except Exception as e:
        logger.debug(f"Access token verification error: {e}")
        if use_raise:
            raise
        return None


async def is_expired_token(token, use_raise=False):
    if TOKEN_VERIFY:
        claims = await verify_token(token, use_raise)
        if not claims:
            return True  # expired
        return False
    try:
        access_token = token.get("access_token")
        claims = jwt.get_unverified_claims(access_token)
        # print(pf(claims))
        # header = jwt.get_unverified_header(access_token)
        # print(pf(header))
        exp = claims.get("exp")
        if exp is None:
            raise jwt_error("no exp claim")
        current_time = int(time.time())
        return (current_time + TOKEN_MIN_VALID_TIME_REMAINING) > exp
    except Exception as e:
        logger.debug("is_expired_token: " + str(e))
        return True  # expired


async def get_token(request: Request):
    token = request.session.get("token")
    if not token:
        return None
    if fer:
        token = decrypt_token(request, token)
        if not token:
            delete_token(request)
            return None
    if not await is_expired_token(token):
        return token
    new_token = await use_refresh_token(request, token)
    if not await is_expired_token(new_token, use_raise=True):
        return new_token
    delete_token(request)
    return None  # not login


def delete_token(request: Request):
    request.session.pop("token", None)


async def get_access_token(request: Request) -> Optional[str]:
    token = await get_token(request)
    if token:
        # print("token from session: " + str(token))  # for debug
        return token.get("access_token")
    return None


def parse_access_token(access_token):
    claims = jwt.get_unverified_claims(access_token)
    header = jwt.get_unverified_header(access_token)
    return pf(header) + "\n" + pf(claims)


def get_user_from_access_token(access_token):
    claims = jwt.get_unverified_claims(access_token)
    return claims.get(TOKEN_USER_CLAIM, None)


def get_csrf(request: Request):
    return request.session.get("csrf")


def gen_csrf(request: Request):
    csrf_token = secrets.token_urlsafe(32)
    request.session["csrf"] = csrf_token
    return csrf_token


async def oidc_auth_common(request):
    try:
        token = await provider.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
    delete_user_passwd(request)
    set_token(request, token)
    access_token = await get_access_token(request)
    user = get_user_from_access_token(access_token)
    log_login(request, user, "access_token")
    # return RedirectResponse(url="./")
    url = request.url_for("index")
    return RedirectResponse(url=url)


@app.get("/", response_class=HTMLResponse)
async def index(request: Request,
                error: str = "",
                session_state: str = None,
                code: str = None):
    if session_state is not None and code is not None:
        return await oidc_auth_common(request)

    login_ok = False
    if error == "":
        error = request.session.get("error", "")
        request.session.pop("error", None)

    sasl_username = ""
    try:
        access_token = await get_access_token(request)
        if access_token:
            login_ok = True
    except Exception as e:
        access_token = None
        error = f"Access token verification error: {str(e)}"

    if access_token is None and error == "":
        user_passwd = get_user_passwd(request)
        if user_passwd:
            user, passwd = user_passwd
            login_ok = True
            sasl_username = user

    csrf_token = gen_csrf(request)
    pat = ""
    logout_url_base = str(request.url_for("logout"))
    logout_url = logout_url_base + "?state=" + csrf_token
    logout_url_with_oidc = ""
    logout_url_oidc_only = await oidc_logout_url()
    exp = -1
    current_time = int(time.time())
    if login_ok and access_token:
        pat = parse_access_token(access_token)
        # NOTE: post_logout_redirect_uri for Keycloak 19 or later
        logout_url_with_oidc = logout_url_oidc_only + "?client_id=" \
            + OIDC_CLIENT_ID + "&post_logout_redirect_uri=" \
            + logout_url + "&state=" + csrf_token
        claims = jwt.get_unverified_claims(access_token)
        exp = claims.get("exp")
    return templates.TemplateResponse("index.html",
                                      {"request": request,
                                       "error": error,
                                       "csrf_token": csrf_token,
                                       "login_ok": login_ok,
                                       "access_token": access_token,
                                       "parsed_at": pat,
                                       "sasl_username": sasl_username,
                                       "logout_url": logout_url,
                                       "logout_url_with_oidc":
                                       logout_url_with_oidc,
                                       "logout_url_oidc_only":
                                       logout_url_oidc_only,
                                       "current_time": current_time,
                                       "exp": exp,
                                       })


@app.get("/login_oidc")
async def login_oidc(request: Request):
    """
    start OIDC login
    """
    if OIDC_OVERRIDE_REDIRECT_URI:
        redirect_uri = OIDC_OVERRIDE_REDIRECT_URI
    else:
        redirect_uri = request.url_for(OIDC_REDIRECT_URI_PAGE)
    try:
        return await provider.authorize_redirect(request, redirect_uri)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth")
async def auth(request: Request,
               session_state: str = None,
               code: str = None):
    """
    get OIDC authorization code
    """
    return await oidc_auth_common(request)


# not needed in newer browsers
# (SEE ALSO: gfarm.js:use_csrf_token)
CHECK_CSRF = False


def check_csrf(request, csrf_token=None, x_csrf_token=None):
    if not CHECK_CSRF:
        return

    if csrf_token:
        logger.debug("csrf_check: using request param")
    else:
        # csrf_token = request.headers.get('X-CSRF-Token')
        csrf_token = x_csrf_token
        logger.debug("csrf_check: using X-CSRF-Token header")
    expected = get_csrf(request)
    if expected is not None:
        if expected != csrf_token:
            msg1 = f"CSRF token mismatch: {expected} != {csrf_token}"
            logger.error(msg1)
            msg2 = "CSRF token mismatch"
            raise HTTPException(status_code=401, detail=msg2)


@app.get("/logout")
async def logout(request: Request,
                 state: Optional[str] = Query(None, description="CSRF token")):
    check_csrf(request, state)
    delete_token(request)
    delete_user_passwd(request)
    # return RedirectResponse(url="./")
    url = request.url_for("index")
    return RedirectResponse(url=url)


class AccessToken(BaseModel):
    access_token: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "access_token": "abcdefg",
                }
            ]
        }
    }


@app.get("/access_token")
async def access_token(request: Request,
                       x_csrf_token: Union[str, None] = Header(default=None)
                       ) -> AccessToken:
    check_csrf(request, x_csrf_token)
    access_token = await get_access_token(request)
    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Not logged in"
        )
    return AccessToken.parse_obj({"access_token": access_token})


def get_user_passwd(request):
    username = request.session.get("username")
    password = request.session.get("password")
    if username is None or password is None:
        return None  # not use password authentication
    if fer:
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
                       password: str = Form(),
                       csrf_token: str = Form()):
    check_csrf(request, csrf_token)
    delete_token(request)
    set_user_passwd(request, username, password)
    env = await set_env(request, None)
    p = await gfwhoami(env)
    try:
        await gfarm_command_standard_response(env, p, "gfwhoami")
    except Exception as e:
        delete_user_passwd(request)
        err = str(e)
        request.session["error"] = err
        # err = urllib.parse.quote(err)
        # url = str(request.url_for("index")) + f"?error={err}"
        url = request.url_for("index")
        log_login_error(request, username, "password", err)
        return RedirectResponse(url=url, status_code=303)
    # OK
    log_login(request, username, "password")
    # return RedirectResponse(url="./", status_code=303)
    url = request.url_for("index")
    return RedirectResponse(url=url, status_code=303)


#############################################################################
def get_content_type(filename: str):
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or 'application/octet-stream'


def fullpath(path: str):
    return "/" + path


AUTHZ_KEY_BASIC = 'Basic'
AUTHZ_KEY_BEARER = 'Bearer'
AUTHZ_TYPE_PASSWORD = 'password'
AUTHZ_TYPE_OAUTH = 'OAuth'

INVALID_AUTHZ = HTTPException(
    status_code=401,
    detail="Invalid Authorization header"
)


def parse_authorization(authz_str: str):
    if not authz_str:
        if not ALLOW_ANONYMOUS:
            logger.error("anonymous access is not allowed")
            raise INVALID_AUTHZ
        # TODO GFARM_HTTP_REQUIRE_ANONYMOUS_HEADER
        # Authorization": Basic (base64(anonymous:))
        authz_type = None
        user = None
        passwd = None
        return authz_type, user, passwd

    # ex. Basic abcdef...
    # ex. Bearer abcdef...
    authz = authz_str.split()
    if len(authz) < 2:
        raise INVALID_AUTHZ

    authz_key = authz[0]
    authz_token = authz[1]
    if authz_key == AUTHZ_KEY_BASIC:
        authz_type = AUTHZ_TYPE_PASSWORD
        try:
            b = base64.b64decode(authz_token.encode())
            user_pass_str = b.decode()
        except Exception as e:
            logger.error(f"invalid Basic authorization: {e}")
            raise INVALID_AUTHZ
        # USERNAME:PASSWORD
        user_pass = user_pass_str.split(":", 1)
        if len(user_pass) >= 2:
            user = user_pass[0]
            passwd = user_pass[1]
        else:
            raise INVALID_AUTHZ
    elif authz_key == AUTHZ_KEY_BEARER:
        authz_type = AUTHZ_TYPE_OAUTH
        user = None
        passwd = authz_token
    else:
        raise INVALID_AUTHZ
    return authz_type, user, passwd


async def switch_auth_from_session(request):
    # get access token from session in cookie
    access_token = await get_access_token(request)
    if access_token is not None:
        authz_type = AUTHZ_TYPE_OAUTH
        user = None
        logger.debug("switch_auth_from_session: AUTHZ_TYPE_OAUTH")
        return authz_type, user, access_token

    # get password from session in cookie
    user_passwd = get_user_passwd(request)
    if user_passwd is not None:
        authz_type = AUTHZ_TYPE_PASSWORD
        user, passwd = user_passwd
        logger.debug("switch_auth_from_session: AUTHZ_TYPE_PASSWORD,"
                     f" user={user}")
        # pass through even if empty password is specified
        return authz_type, user, passwd

    return None


LOG_USERNAME_KEY = "_GFARM_HTTP_USERNAME"
LOG_CLIENT_IP_KEY = "_GFARM_HTTP_CLIENT_IP"


async def set_env(request, authorization):
    ipaddr = get_client_ip_from_request(request)

    env = {'PATH': os.environ['PATH']}
    if GFARM_CONFIG_FILE:
        gfarm_config = os.path.expanduser(GFARM_CONFIG_FILE)
        env.update({'GFARM_CONFIG_FILE': gfarm_config})

    # prefer session
    auth_info = await switch_auth_from_session(request)
    if auth_info is not None:
        authz_type, user, passwd = auth_info
    else:
        # get access token or password from Authorization header
        authz_type, user, passwd = parse_authorization(authorization)
        logger.debug(f"set_env: authz header / user={user}")

    if authz_type == AUTHZ_TYPE_OAUTH:
        access_token = passwd
        try:
            user = get_user_from_access_token(access_token)
        except Exception as e:
            logger.error(f"{ipaddr} Invalid Bearer token:"
                         f" access_token={access_token}, error={e}")
            raise INVALID_AUTHZ
        if user is not None:
            env.update({'GFARM_SASL_USER': user})
        env.update({
            # for Gfarm 2.8.6 or later
            'GFARM_SASL_MECHANISMS': 'XOAUTH2',
            # In libgfarm, GFARM_SASL_PASSWORD is preferentially
            # used over JWT_USER_PATH
            'GFARM_SASL_PASSWORD': access_token,
            # for old libgfarm (Gfarm 2.8.5 or earlier)
            'JWT_USER_PATH': f'!{bin_dir}/GFARM_SASL_PASSWORD_STDOUT.sh',
        })
    elif authz_type == AUTHZ_TYPE_PASSWORD:
        # TODO and user != "anonymous"
        env.update({
            # for Gfarm 2.8.6 or later
            'GFARM_SASL_MECHANISMS': SASL_MECHANISM_FOR_PASSWORD,
            'GFARM_SASL_USER': user,
            'GFARM_SASL_PASSWORD': passwd,
        })
    else:  # anonymous
        user = "anonymous"
        env.update({
            # for Gfarm 2.8.6 or later
            'GFARM_SASL_MECHANISMS': 'ANONYMOUS',
            'GFARM_SASL_USER': user,
        })

    env.update({
        LOG_USERNAME_KEY: user,
        # https://www.starlette.io/requests/#client-address
        LOG_CLIENT_IP_KEY: ipaddr,
    })
    if DEBUG:
        copy_env = env.copy()
        if "GFARM_SASL_PASSWORD" in copy_env:
            copy_env["GFARM_SASL_PASSWORD"] = '*****(MASKED)'
        logger.debug("env:\n" + pf(copy_env))
    return env


def get_user_from_env(env):
    return env.get(LOG_USERNAME_KEY, "UNKNOWN_USER")


def get_client_ip_from_env(env):
    return env.get(LOG_CLIENT_IP_KEY, "NO_CLIENT_IP")


def get_client_ip_from_request(request):
    return request.client.host

async def set_tokenfilepath_to_env(request, env, filepath=None, expire=None):
    tokenfile = filepath
    
    if expire is not None:
        current_time = int(time.time())
        logger.debug(f'expiretime: {expire-(current_time+TOKEN_MIN_VALID_TIME_REMAINING)}')
        if (current_time + TOKEN_MIN_VALID_TIME_REMAINING) <= expire:
            return tokenfile, env, expire
        
    access_token = await get_access_token(request)
    if access_token is None:
        return None, env, expire
    
    claims = jwt.get_unverified_claims(access_token)
    exp = claims.get("exp", None)        
    
    # Create token file
    if tokenfile is None:
        user = claims.get(TOKEN_USER_CLAIM, None)
        tmpdir = f"{TMPDIR}/{user}/" if user is not None else TMPDIR
        env.pop('GFARM_SASL_PASSWORD', None)
        os.makedirs(tmpdir, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=tmpdir, delete_on_close=False) as fp:
            tokenfile = fp.name
            env['JWT_USER_PATH'] = tokenfile
    
    # Write access_token in the token file
    with open(tokenfile, "w") as f:
        f.write(access_token)
    ipaddr = get_client_ip_from_request(request)
    logger.debug(f"{ipaddr}:0 user={user}, access_token file:{tokenfile} updated")
    return tokenfile, env, exp

#############################################################################
def keyval(s):
    # s: "  Key1: Val1..."
    # return: "Key1", "Val1..."
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
        logger.error("Invalid timestamp format: " + str(e))
        return None


class UpdateStat(BaseModel):
    Mode: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "Mode": "1777",
                }
            ]
        }
    }


class Stat(BaseModel):
    File: Optional[str] = None
    Filetype: Optional[str] = None
    Size: Optional[int] = None
    Uid: Optional[str] = None
    Gid: Optional[str] = None
    Mode: Optional[str] = None
    Gen: Optional[int] = None
    Inode: Optional[int] = None
    Ncopy: Optional[int] = None
    Links: Optional[int] = None
    AccessSecound: Optional[float] = None
    Access: Optional[str] = None
    ModifySecound: Optional[float] = None
    Modify: Optional[str] = None
    ChangeSecound: Optional[float] = None
    Change: Optional[str] = None
    MetadataHost: Optional[str] = None
    MetadataPort: Optional[str] = None
    MetadataUser: Optional[str] = None

    model_config = {
        "json_schema_extra": {
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
    }


def parse_gfstat(file_info_str):
    file_info = {}
    lines = file_info_str.splitlines()
    for line in lines:
        line = line.strip()
        if not line:
            continue
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
    # return Stat.parse_obj(file_info)  # Pydantic V1
    return Stat.model_validate(file_info)  # Pydantic V2


#############################################################################
async def gfwhoami(env):
    args = []
    return await asyncio.create_subprocess_exec(
        'gfwhoami', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def gfrm(env, path, force=False):
    if force:
        args = ["-f", path]
    else:
        args = [path]
    return await asyncio.create_subprocess_exec(
        'gfrm', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def gfmv(env, src, dest):
    args = [src, dest]
    return await asyncio.create_subprocess_exec(
        'gfmv', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


def sync_gfexport(env, path):
    args = ['gfexport', path]
    return subprocess.Popen(
        args, shell=False, close_fds=True,
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL)


async def gfexport(env, path):
    args = [path]
    return await asyncio.create_subprocess_exec(
        'gfexport', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def gfreg(env, path, mtime):
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


async def gfls(env, path, _all=0, recursive=0, _long=0, effperm=0):
    args = []
    if _all == 1:
        args.append('-a')
    if recursive == 1:
        args.append('-R')
    if _long == 1:
        args.append('-l')
    if effperm == 1:
        args.append('-e')
    args.append('-T')
    args.append(path)
    return await asyncio.create_subprocess_exec(
        'gfls', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT)


async def gfmkdir(env, path, p=0):
    args = []
    if p == 1:
        args.append('-p')
    args.append(path)
    return await asyncio.create_subprocess_exec(
        'gfmkdir', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def gfrmdir(env, path):
    args = [path]
    return await asyncio.create_subprocess_exec(
        'gfrmdir', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def gfstat(env, path, metadata):
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


async def gfchmod(env, path, mode):
    args = [mode, path]
    return await asyncio.create_subprocess_exec(
        'gfchmod', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)

# # SEE ALSO: gfptar
# PAT_ENTRY = re.compile(r'^\s*(\d+)\s+([-dl]\S+)\s+(\d+)\s+(\S+)\s+(\S+)\s+'
#                        r'(\d+)\s+(\S+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+(.+)$')
# async def file_size(env, path):
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


async def file_size(env, path):
    metadata = False
    proc = await gfstat(env, path, metadata)
    elist = []
    stderr_task = asyncio.create_task(log_stderr("gfstat", proc, elist))
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
        existing = True
        is_file = (st.Filetype == "regular file")
        size = st.Size
    logger.debug(f"file_size: {existing}, {is_file}, {size}")
    return existing, is_file, size

async def gfptar(env, 
                 cmd:str, 
                 outdir, 
                 basedir, 
                 src,
                 options={}):
    args = []
    for key, value in options.items():
        if value is None:
            continue
        args.append(f"--{key}={value}")

    if cmd == "x":
        args.extend([f"-{cmd}", outdir, src])
    else:
        args.extend([f"-{cmd}", outdir, "-C", basedir, src])

    return await asyncio.create_subprocess_exec(
        'gfptar', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)

#############################################################################
async def log_stderr(command: str,
                     process: asyncio.subprocess.Process,
                     elist: list) -> None:
    if process.stderr is None:
        return
    while True:
        line = await process.stderr.readline()
        if line:
            msg = line.decode().strip()
            logger.debug(f"STDERR: {command}: {msg}")
            elist.append(msg)
        else:
            break


def last_emsg(elist):
    if len(elist) > 0:
        return elist[-1]
    return ""


def is_utf8(s):
    try:
        s.encode('utf-8').decode('utf-8')
        return True
    except Exception:
        return False


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


async def gfarm_command_standard_response(env, proc, command):
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(command, proc, elist))
    data = await proc.stdout.read()
    stdout = data.decode()
    await stderr_task
    return_code = await proc.wait()
    if return_code != 0:
        errstr = str(elist)
        last_e = last_emsg(elist)
        if "authentication error" in errstr:
            code = 401
            message = "Authentication error"
        else:
            code = 500
            message = "Error"
        logger.opt(depth=1).debug(
            f"{ipaddr}:0 user={user}, cmd={command}, return={return_code},"
            f" last_emsg={last_e}")
        raise gfarm_http_error(command, code, message, stdout, elist)
    if DEBUG:
        if is_utf8(stdout):
            out = stdout.strip()
        else:
            out = "(binary data)"
        logger.opt(depth=1).debug(
            f"{ipaddr}:0 user={user}, cmd={command}, stdout={out}")
    return PlainTextResponse(content=stdout)


#############################################################################
@app.get("/c/me")
@app.get("/conf/me")
@app.get("/config/me")
async def whoami(request: Request,
                 authorization: Union[str, None] = Header(default=None)):
    opname = "gfwhoami"
    env = await set_env(request, authorization)
    log_operation(env, opname, None)
    p = await gfwhoami(env)
    return await gfarm_command_standard_response(env, p, opname)


@app.get("/d/{gfarm_path:path}")
@app.get("/dir/{gfarm_path:path}")
@app.get("/directories/{gfarm_path:path}")
async def dir_list(gfarm_path: str,
                   request: Request,
                   a: int = 0,
                   e: int = 0,
                   R: int = 0,
                   l: int = 0,  # noqa: E741
                   format: str = 'json',
                   ign_err: int = 0,
                   authorization: Union[str, None] = Header(default=None)):
    opname = "gfls"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    log_operation(env, opname, gfarm_path)
    p = await gfls(env, gfarm_path, _all=a, recursive=R, _long=l, effperm=e)
    data = await p.stdout.read()
    stdout = data.decode()
    return_code = await p.wait()
    if ign_err == 0 and return_code != 0:
        logger.debug(
            f"{ipaddr}:0 user={user}, cmd={opname}, return={return_code},"
            f" message={stdout}")
        code = 500
        message = f"gfls error: path={gfarm_path}"
        elist = []
        raise gfarm_http_error(opname, code, message, stdout, elist)

    if format == 'json':
        json = []
        for line in stdout.splitlines():
            logger.debug(f"line={line}")
            m = PAT_ENTRY2.match(line) # -alが指定されていないと空のJSONが返る
            if m is None:
                continue
            logger.debug(f"m={m}")
            mode_str = m.group(1)
            isfile = mode_str[0] != 'd'
            nlink = int(m.group(2))
            uname = m.group(3)
            gname = m.group(4)
            size = int(m.group(5))
            mtime_str = m.group(6)
            name = m.group(7)
            json.append({
                "mode_str": mode_str,
                "isfile": isfile,
                "nlink": nlink,
                "uname": uname,
                "gname": gname,
                "size": size,
                "mtime_str": mtime_str,
                "name": name,
                "path": os.path.join(gfarm_path, name)
            })
        logger.debug(f"{ipaddr}:0 user={user}, cmd={opname}, json={json}")
        return JSONResponse(content=json)

    logger.debug(f"{ipaddr}:0 user={user}, cmd={opname}, stdout={stdout}")
    return PlainTextResponse(content=stdout)


@app.put("/d/{gfarm_path:path}")
@app.put("/dir/{gfarm_path:path}")
@app.put("/directories/{gfarm_path:path}")
async def dir_create(gfarm_path: str,
                     request: Request,
                     authorization: Union[str, None] = Header(default=None),
                     x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    opname = "gfmkdir"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    log_operation(env, opname, gfarm_path)
    p = await gfmkdir(env, gfarm_path, p=1) # TODO: p should be passed as a parameter
    return await gfarm_command_standard_response(env, p, opname)


@app.delete("/d/{gfarm_path:path}")
@app.delete("/dir/{gfarm_path:path}")
@app.delete("/directories/{gfarm_path:path}")
async def dir_remove(gfarm_path: str,
                     request: Request,
                     authorization: Union[str, None] = Header(default=None),
                     x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    opname = "gfrmdir"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    log_operation(env, opname, gfarm_path)
    p = await gfrmdir(env, gfarm_path)
    return await gfarm_command_standard_response(env, p, opname)


# BUFSIZE = 1
# BUFSIZE = 65536
BUFSIZE = 1024 * 1024

ASYNC_GFEXPORT = str2bool(conf.GFARM_HTTP_ASYNC_GFEXPORT)


@app.get("/f/{gfarm_path:path}")
@app.get("/file/{gfarm_path:path}")
async def file_export(gfarm_path: str,
                      request: Request,
                      action: str = 'view',
                      authorization: Union[str, None] = Header(default=None)):
    opname = "gfexport"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    log_operation(env, opname, gfarm_path)
    existing, is_file, size = await file_size(env, gfarm_path)
    if not existing:
        code = 404
        message = "The requested URL does not exist."
        stdout = ""
        elist = []
        raise gfarm_http_error(opname, code, message, stdout, elist)
    if not is_file:
        code = 415
        message = "The requested URL does not represent a file."
        stdout = ""
        elist = []
        raise gfarm_http_error(opname, code, message, stdout, elist)

    if int(size) <= 0:
        return Response(status_code=204)  # 0 byte OK

    env = await set_env(request, authorization)  # may refresh
    if ASYNC_GFEXPORT:
        p = await gfexport(env, gfarm_path)
        elist = []
        stderr_task = asyncio.create_task(log_stderr(opname, p, elist))
    else:
        # stderr is not supported
        p = sync_gfexport(env, gfarm_path)

    # size > 0
    if ASYNC_GFEXPORT:
        first_byte = await p.stdout.read(1)
    else:
        first_byte = p.stdout.read(1)
    if not first_byte:
        if ASYNC_GFEXPORT:
            await stderr_task
        # TODO check_writable() : True ... 500,  False ... 403
        code = 403
        message = f"Cannot read: path={gfarm_path}"
        stdout = ""
        raise gfarm_http_error(opname, code, message, stdout, elist)

    async def generate():
        yield first_byte

        while True:
            if ASYNC_GFEXPORT:
                d = await p.stdout.read(BUFSIZE)
            else:
                d = p.stdout.read(BUFSIZE)
            if not d:
                break
            yield d
        if ASYNC_GFEXPORT:
            await stderr_task
            return_code = await p.wait()
        else:
            return_code = p.wait()
        if return_code != 0:
            # network error? disk error?
            logger.warning(
                f"{ipaddr}:0 user={user}, cmd={opname}, path={gfarm_path},"
                f" return={return_code}, stderr={str(elist)}")

    ct = get_content_type(gfarm_path)
    cl = str(size)
    headers = {"content-length": cl}
    if action == 'download':
        filename = os.path.basename(gfarm_path)
        encoded = urllib.parse.quote(filename, encoding='utf-8')
        # RFC 5987,8187
        cd = f"attachment; filename*=UTF-8' '\"{encoded}\""
        # cd = f"attachment; filename=\"{encoded}\""
        headers.update({"content-disposition": cd})
    return StreamingResponse(content=generate(),
                             media_type=ct,
                             headers=headers,
                             )

class FileList(BaseModel):
    files: List[str]

async def get_filelist(env, gfarm_path):
    p = await gfls(env, gfarm_path, _all=1, _long=1)
    data = await p.stdout.read()
    stdout = data.decode()
    return_code = await p.wait()
    if return_code != 0:
        return []

    filelist = []
    for line in stdout.splitlines():
        logger.debug(f"line={line}")
        m = PAT_ENTRY2.match(line)
        if m is None:
            continue
        name = m.group(7)
        filelist.append(os.path.join(gfarm_path, name))

    return filelist

@app.get("/files")
@app.post("/download/zip_w_stream")
async def download_zip(filelist: FileList, 
                       request: Request, 
                       authorization: Union[str, None] = Header(default=None)):
    opname = "gfexport"
    env = await set_env(request, authorization)
    log_operation(env, opname, filelist.files)
    logger.debug(f"filelist.files: {filelist.files}")
    
    async def generator(files):
        zs = zipstream.ZipFile(mode='w', compression=zipstream.ZIP_DEFLATED)
        async def add_files(files, parent=''):
            for path in files:
                logger.debug(f"path: {path}")
                full = fullpath(path)
                logger.debug(f"full: {full}")
                exists, is_file, size = await file_size(env, full)
                if not exists:
                    continue
                if not is_file:
                    sublist = await get_filelist(env, path)
                    await add_files(sublist, os.path.join(parent, os.path.basename(path)))
                if int(size) <= 0:
                    continue
                p = sync_gfexport(env, full)
                def get_data():
                    while True:
                        chunk = p.stdout.read(BUFSIZE)
                        if not chunk:
                            break
                        yield chunk
                zs.write_iter(
                    os.path.join(parent, os.path.basename(path)), 
                    get_data(), zipstream.ZIP_DEFLATED)
        await add_files(files)
        for chunk in zs:
            yield chunk
    zipname = f'download_{datetime.now().strftime('%Y%m%d-%H%M%S')}'
    headers = {
        "Content-Disposition": f'attachment; filename="{zipname}.zip"'
    }
    return StreamingResponse(generator(filelist.files), media_type="application/zip", headers=headers)

@app.put("/f/{gfarm_path:path}")
@app.put("/file/{gfarm_path:path}")
@app.put("/files/{gfarm_path:path}")
async def file_import(gfarm_path: str,
                      request: Request,
                      x_file_timestamp:
                      Union[str, None] = Header(default=None),
                      authorization: Union[str, None] = Header(default=None),
                      x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    # TODO overwrite=1, defaut 0
    # TODO check writable parent dir or target file
    opname = "gfreg"
    gfarm_path = fullpath(gfarm_path)
    filename = os.path.basename(gfarm_path)
    # NOTE: MAXNAMLEN == 255
    filename_prefix = filename[:128]

    choices = string.ascii_letters + string.digits
    randstr = ''.join(random.choices(choices, k=8))
    tmpname = "gfarm-http.upload." + filename_prefix + "." + randstr
    tmppath = os.path.join(os.path.dirname(gfarm_path), tmpname)

    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    log_operation(env, opname, gfarm_path)
    p = await gfreg(env, tmppath, x_file_timestamp)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(opname, p, elist))
    error = None
    try:
        async for chunk in request.stream():
            p.stdin.write(chunk)
            await p.stdin.drain()  # speedup
    except Exception as e:
        logger.exception(f"{ipaddr}:0 user={user}, cmd={opname},"
                         f" path={tmppath}")
        error = e

    p.stdin.close()
    await stderr_task
    return_code = await p.wait()
    logger.debug(f"{ipaddr}:0 user={user}, cmd={opname}, path={tmppath},"
                 f" return={return_code}")

    if return_code == 0 and error is None:
        env = await set_env(request, authorization)  # may refresh
        gfmv_cmd = "gfmv"
        p2 = await gfmv(env, tmppath, gfarm_path)
        stderr_task2 = asyncio.create_task(log_stderr(gfmv_cmd, p2, elist))
        await stderr_task2
        return_code = await p2.wait()
        logger.debug(f"{ipaddr}:0 user={user}, cmd={gfmv_cmd}, src={tmppath},"
                     f" dest={gfarm_path}, return={return_code}")
        if return_code == 0:
            return Response(status_code=200)

    # error case
    env = await set_env(request, authorization)  # may refresh
    p3 = await gfrm(env, tmppath, force=True)
    gfrm_cmd = "gfrm"
    stderr_task3 = asyncio.create_task(log_stderr(gfrm_cmd, p3, elist))
    await stderr_task3
    # ignore error
    return_code = await p3.wait()
    logger.debug(f"{ipaddr}:0 user={user}, cmd={gfrm_cmd}, path={tmppath},"
                 f" return={return_code}")

    code = 500
    if error:
        message = f"I/O error({str(error)}): path={gfarm_path}"
    else:
        message = f"gfreg error: path={gfarm_path}"
    stdout = ""
    raise gfarm_http_error(opname, code, message, stdout, elist)


@app.delete("/f/{gfarm_path:path}")
@app.delete("/file/{gfarm_path:path}")
@app.delete("/files/{gfarm_path:path}")
async def file_remove(gfarm_path: str,
                      request: Request,
                      authorization: Union[str, None] = Header(default=None),
                      x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    opname = "gfrm"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    log_operation(env, opname, gfarm_path)
    p = await gfrm(env, gfarm_path)
    return await gfarm_command_standard_response(env, p, opname)


class Move(BaseModel):
    source: str
    destination: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "source": "/tmp/testfile1",
                    "destination": "/tmp/testfile2",
                }
            ]
        }
    }


@app.post("/move")
async def move_rename(request: Request,
                      move_data: Move,
                      authorization: Union[str, None] = Header(default=None),
                      x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    opname = "gfmv"
    src = move_data.source
    dest = move_data.destination
    env = await set_env(request, authorization)
    log_operation(env, opname, {"src": src, "dest": dest})
    p = await gfmv(env, src, dest)
    return await gfarm_command_standard_response(env, p, opname)


@app.get("/a/{gfarm_path:path}")
@app.get("/attr/{gfarm_path:path}")
@app.get("/attributes/{gfarm_path:path}")
async def get_attr(gfarm_path: str,
                   request: Request,
                   authorization: Union[str, None] = Header(default=None)
                   ) -> Stat:
    opname = "gfstat"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    log_operation(env, opname, gfarm_path)
    metadata = True
    proc = await gfstat(env, gfarm_path, metadata)

    elist = []
    stderr_task = asyncio.create_task(log_stderr(opname, proc, elist))
    data = await proc.stdout.read()
    stdout = data.decode()
    await stderr_task
    return_code = await proc.wait()
    if return_code != 0:
        errstr = str(elist)
        if "authentication error" in errstr:
            code = 401
            message = "Authentication error"
            raise gfarm_http_error(opname, code, message, stdout, elist)
        else:
            code = 500
            message = "Error"
            raise gfarm_http_error(opname, code, message, stdout, elist)
    st = parse_gfstat(stdout)
    logger.debug("Stat=\n" + pf(st.model_dump()))
    return st


@app.post("/a/{gfarm_path:path}")
@app.post("/attr/{gfarm_path:path}")
@app.post("/attributes/{gfarm_path:path}")
async def change_attr(gfarm_path: str,
                      stat: UpdateStat,
                      request: Request,
                      authorization: Union[str, None] = Header(default=None),
                      x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    response = None
    opname = None
    if stat.Mode:
        opname = "gfchmod"
        log_operation(env, opname, (stat.Mode, gfarm_path))
        proc = await gfchmod(env, gfarm_path, stat.Mode)
        response = await gfarm_command_standard_response(env, proc, opname)
    if response:
        return response
    else:
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
        message = "No input data (unsupported fields)"
        stdout = None
        elist = None
        raise gfarm_http_error(opname, code, message, stdout, elist)

class Tar(BaseModel):
    command: str
    basedir: str
    source: str
    outdir: str
    exclude: str | None
    jobs: int | None
    size: str | None
    type: str | None
    compress: str | None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "command": "c",
                    "basedir": "/",
                    "source": "./tmp",
                    "outdir": "/tmp2",
                    "exclude": "",
                    "jobs": 4,
                    "size": "200Mi",
                    "type": "gz",
                    "compress": ""

                }
            ]
        }
    }

@app.post("/gfptar")
async def compress_or_extract(request: Request,
                    tar_data: Tar,
                    authorization: Union[str, None] = Header(default=None)):
    opname = "gfptar"
    env = await set_env(request, authorization)
    # Set the token file path to env
    tokenfilepath, env, expire = await set_tokenfilepath_to_env(request, env)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    log_operation(env, opname, tar_data)

    tar_dict = tar_data.model_dump()
    cmd = tar_dict.pop("command", None)
    basedir = tar_dict.pop("basedir", None)
    src = tar_dict.pop("source", None)
    outdir = tar_dict.pop("outdir", None)

    p = await gfptar(env, cmd, outdir, basedir, src, tar_dict)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(opname, p, elist))

    async def stream_response():
        try:
            exp = expire
            buffer = b""
            while True:
                chunk = await p.stdout.read(1)
                if not chunk:
                    break
                buffer += chunk
                # logger.debug(f"buffer:{buffer}")
                if b"\r" in buffer or b"\n" in buffer:
                    msg = buffer.decode("utf-8", errors="replace").strip()
                    buffer = b""
                    json_line = json.dumps({ "message": msg }) # TODO:msgを項目ごとに変換する
                    yield json_line + '\n'
                    logger.debug(f"{ipaddr}:0 user={user}, cmd={opname}, json={json_line}")
                    # Update access_token
                    _, _, exp = await set_tokenfilepath_to_env(request, env, tokenfilepath, exp)
            await stderr_task
            return_code = await p.wait()
            if return_code != 0:
                # error!
                code = status.HTTP_500_INTERNAL_SERVER_ERROR
                message = f"path={outdir}"
                stdout = buffer.decode("utf-8", errors="replace").strip()
                raise gfarm_http_error(opname, code, message, stdout, elist)
        except asyncio.CancelledError:
            p.terminate()
            logger.error(f"{ipaddr}:0 user={user}, cmd={opname}, Client disconnected")
        finally:
            try:
                os.remove(tokenfilepath)
            except Exception as e:
                logger.error(f"{ipaddr}:0 user={user}, cmd={opname}, os.remove({tokenfilepath}) error: {e}")

    return StreamingResponse(content=stream_response(),
                             media_type='application/json')