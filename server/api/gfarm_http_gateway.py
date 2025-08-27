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
from typing import (
    List,
    Union,
    Optional,
    AsyncGenerator,
    Literal,
    Dict,
    Callable)
import urllib
import re
import tempfile
import shutil
import zipfile
from collections import deque
import threading
import stat

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
                               JSONResponse,
                               FileResponse)
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from cryptography.fernet import Fernet

# https://github.com/mpdavis/python-jose/blob/master/jose/jwt.py
from jose import jwt


def exit_error():
    logger.error("Exit (error)")
    sys.exit(1)


STORAGE_URL_PREFIX = "#/ui"

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
    # "GFARM_HTTP_KEYCLOAK_SERVER",         # optional
    # "GFARM_HTTP_KEYCLOAK_REALM",          # optional
    "GFARM_HTTP_OIDC_REDIRECT_URI_PAGE",
    "GFARM_HTTP_OIDC_OVERRIDE_REDIRECT_URI",
    "GFARM_HTTP_OIDC_CLIENT_ID",
    "GFARM_HTTP_OIDC_CLIENT_SECRET",
    # GFARM_HTTP_KEYCLOAK_RELATIVE_PATH,    # optional
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
    "GFARM_HTTP_SESSION_MAX_AGE",
    "GFARM_HTTP_RECURSIVE_MAX_DEPTH",
    "GFARM_HTTP_TMPDIR"
]

# parameters
conf_file = os.environ.get("GFARM_HTTP_CONFIG_FILE", "gfarm-http-gateway.conf")
if os.path.exists(conf_file):
    conf_dict = load_config_from_file(conf_file)
else:
    conf_dict = {}

env_dict = load_config_from_env()

merged_dict = conf_dict
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
verify_path = os.environ.get("REQUESTS_CA_BUNDLE", None)
if verify_path is not None:
    VERIFY_CERT = verify_path  # set to custom CA path
SASL_MECHANISM_FOR_PASSWORD = conf.GFARM_HTTP_SASL_MECHANISM_FOR_PASSWORD
ALLOW_ANONYMOUS = str2bool(conf.GFARM_HTTP_ALLOW_ANONYMOUS)

try:
    SESSION_MAX_AGE = int(conf.GFARM_HTTP_SESSION_MAX_AGE)
except Exception as e:
    logger.warning("Invalid value for SESSION_MAX_AGE: " + {str(e)})
    SESSION_MAX_AGE = 60 * 60 * 24  # 1 day

try:
    RECURSIVE_MAX_DEPTH = int(conf.GFARM_HTTP_RECURSIVE_MAX_DEPTH)
except Exception as e:
    logger.warning("Invalid value for SESSION_MAX_AGE: " + {str(e)})
    RECURSIVE_MAX_DEPTH = 16

TMPDIR = conf.GFARM_HTTP_TMPDIR


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

# not change (duplicated messages are printed)
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


def log_operation(env, method, apiname, opname, args):
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    logger.opt(depth=1).info(
        f"{ipaddr}:0 user={user}, cmd={method}:{apiname}:{opname}, " +
        f"args={str(args)}")


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
def check_tempdir_mode():
    if os.path.exists(TMPDIR):
        st = os.stat(TMPDIR)
        mode = stat.S_IMODE(st.st_mode)
        owner = st.st_uid
        print("check_tempdir_mode", owner, mode)

        if owner != os.getuid():
            raise PermissionError(
                f"{TMPDIR} must be owned by uid {os.getuid()} "
                f"(current owner uid is {owner})"
            )

        if mode != 0o700:
            raise PermissionError(
                f"{TMPDIR} must be private (mode 0o700) "
                f"(current mode is {oct(mode)})"
            )


def manage_tempfiles():
    if os.path.exists(TMPDIR):
        check_tempdir_mode()
        shutil.rmtree(TMPDIR)
    os.makedirs(TMPDIR, mode=0o700)
    check_tempdir_mode()


manage_tempfiles()

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

app.mount("/assets",
          StaticFiles(directory="frontend/app/react-app/dist/assets"),
          name="assets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    # allow_methods=["*"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

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
    necessary_token = {}
    necessary_token["access_token"] = token.get("access_token")
    necessary_token["refresh_token"] = token.get("refresh_token")
    if fer:
        necessary_token = encrypt_token(necessary_token)
    request.session["token"] = necessary_token


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
        delete_user_passwd(request)
        set_token(request, token)
        access_token = await get_access_token(request)
        user = get_user_from_access_token(access_token)
        log_login(request, user, "access_token")
    except Exception as e:
        # raise HTTPException(status_code=401, detail=str(e))
        request.session["error"] = str(e)
    url = await get_next_url(request)
    return RedirectResponse(url=url)


async def login_check(request: Request,
                      error: str = "",
                      session_state: str = None,
                      code: str = None):
    login_ok = False
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

    return login_ok, access_token, sasl_username, error


@app.get("/", response_class=HTMLResponse)
async def index(request: Request,
                error: str = "",
                session_state: str = None,
                code: str = None):
    if session_state is not None and code is not None:
        return await oidc_auth_common(request)

    _, _, _, error = await login_check(
        request, error, session_state, code)

    if error != "":
        request.session["error"] = error

    return FileResponse("frontend/app/react-app/dist/index.html")


@app.get("/debug", response_class=HTMLResponse)
async def debug_page(request: Request,
                     error: str = "",
                     session_state: str = None,
                     code: str = None):
    login_ok, access_token, sasl_username, error = await login_check(
        request, session_state, code)

    if error != "":
        request.session["error"] = error

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


@app.get("/user_info")
async def user_info(request: Request,
                    authorization: Union[str, None] = Header(default=None)):
    access_token = await get_access_token(request)
    user = None
    name = None
    if access_token:
        user = get_user_from_access_token(access_token)
    else:
        user_passwd = get_user_passwd(request)
        if user_passwd:
            user, _ = user_passwd
    if user or authorization:
        env = await set_env(request, authorization)
        username = await get_username(env)
        if username:
            name, _, home_directory, _ = await gfuser_info(env, username)
            return JSONResponse(content={"username": name,
                                         "loginname": user,
                                         "home_directory": home_directory})
    raise HTTPException(status_code=401, detail="failed to get user info")


@app.get("/login")
async def login_page(request: Request,
                     redirect: Union[str, None] = None):
    csrf_token = gen_csrf(request)
    error = request.session.get("error", "")
    request.session.pop("error", None)
    request.session["next_url"] = redirect
    return templates.TemplateResponse("login.html",
                                      {"request": request,
                                       "error": error,
                                       "csrf_token": csrf_token})


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


async def get_next_url(request: Request,
                       env=None,
                       authorization: Union[str, None] = None):
    try:
        if env is None:
            env = await set_env(request, authorization)
    except Exception as e:
        logger.error(f"{str(e)}")
        return request.url_for("index").path

    url = request.session.get("next_url", None)
    if url is None:
        username = await get_username(env)
        if username is None:
            return request.url_for("index").path
        _, _, home, _ = await gfuser_info(env, username)
        return request.url_for("index").path + STORAGE_URL_PREFIX + home
    return url


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
    url = await get_next_url(request, env)
    try:
        await gfarm_command_standard_response(env, p, "gfwhoami")
        # OK
        log_login(request, username, "password")
    except Exception as e:
        delete_user_passwd(request)
        err = str(e)
        request.session["error"] = err
        log_login_error(request, username, "password", err)
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
        if (current_time + TOKEN_MIN_VALID_TIME_REMAINING) <= expire:
            return tokenfile, env, expire

    access_token = await get_access_token(request)
    if access_token is None:
        return None, env, expire

    claims = jwt.get_unverified_claims(access_token)
    exp = claims.get("exp", None)

    user = claims.get(TOKEN_USER_CLAIM, None)
    # Create token file
    if tokenfile is None:
        tmpdir = f"{TMPDIR}/{user}/" if user is not None else TMPDIR
        env.pop('GFARM_SASL_PASSWORD', None)
        os.makedirs(tmpdir, mode=0o700, exist_ok=True)
        with tempfile.NamedTemporaryFile(
                dir=tmpdir,
                delete_on_close=False) as fp:
            tokenfile = fp.name
            env['JWT_USER_PATH'] = tokenfile

    # Write access_token in the token file
    with open(tokenfile, "w") as f:
        f.write(access_token)
    ipaddr = get_client_ip_from_request(request)
    logger.debug(
        f"{ipaddr}:0 user={user}, access_token file:{tokenfile} updated"
    )
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
    AccessSeconds: Optional[int] = None
    AccessNanos: Optional[int] = None
    Access: Optional[str] = None
    ModifySeconds: Optional[int] = None
    ModifyNanos: Optional[int] = None
    Modify: Optional[str] = None
    ChangeSeconds: Optional[int] = None
    ChangeNanos: Optional[int] = None
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
                    "AccessSeconds": 1739212053,
                    "AccessNanos": 191688000,
                    "Access": "2025-02-10 18:27:33.191688 +0000",
                    "ModifySeconds": 1739212051,
                    "ModifyNanos": 71120000,
                    "Modify": "2025-02-10 18:27:31.071120 +0000",
                    "ChangeSeconds": 1739178909,
                    "ChangeNanos": 400000000,
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
                file_info[key + "Seconds"] = int(value_sec)
                file_info[key + "Nanos"] = int(nsec)
        elif key is None:
            continue
        file_info[key] = value
    # return Stat.parse_obj(file_info)  # Pydantic V1
    return Stat.model_validate(file_info)  # Pydantic V2


def from_rwx(rwx, highchar):
    perm = 0
    highbit = 0
    r = rwx[0]
    w = rwx[1]
    x = rwx[2]
    if r == 'r':
        perm |= 0o4
    if w == 'w':
        perm |= 0o2
    if x == 'x':
        perm |= 0o1
    elif x == highchar:
        perm |= 0o1
        highbit = 0o1
    elif x == highchar.upper():
        highbit = 0o1
    return perm, highbit


class ACInfo(BaseModel):
    acl_type: str
    acl_name: Union[str, None]
    acl_perms: Dict[str, bool]
    is_default: bool

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "acl_type": "user",
                    "acl_name": "name",
                    "acl_perms": {
                        "r": True,
                        "w": True,
                        "x": True,
                    },
                    "is_default": False,
                }
            ]
        }
    }


class ACList(BaseModel):
    acl: List[ACInfo]

    def make_acl_str(self, join_char) -> str:
        acl_parts = []
        for acinfo in self.acl:
            prefix = "default:" if acinfo.is_default else ""
            type_part = f"{acinfo.acl_type}:"
            name_part = f"{acinfo.acl_name}:" if acinfo.acl_name else ":"
            r_part = "r" if acinfo.acl_perms["r"] else "-"
            w_part = "w" if acinfo.acl_perms["w"] else "-"
            x_part = "x" if acinfo.acl_perms["x"] else "-"
            acl_parts.append(f"{prefix}{type_part}{name_part}" +
                             f"{r_part}{w_part}{x_part}")
        return join_char.join(acl_parts)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "acl": [
                        {
                            "acl_type": "user",
                            "acl_name": "name",
                            "acl_perms": "rwx",
                            "is_default": False,
                        }
                    ]
                }
            ]
        }
    }


def parse_gfgetfacl(acl_str) -> Union[ACList, None]:
    acl = []
    lines = acl_str.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('#'):
            continue

        is_default = False
        if line.startswith('default:'):
            is_default = True
            line = line[len('default:'):]

        match = re.match(r"(user|group|other)(?::([^:]*))?:([rwx-]+)", line)

        if match:
            acl_type = match.group(1)
            acl_name = match.group(2) if match.group(2) else None
            acl_perms = {}
            for key in ["r", "w", "x"]:
                acl_perms[key] = key in match.group(3)
            acl.append(ACInfo(acl_type=acl_type,
                              acl_name=acl_name,
                              acl_perms=acl_perms,
                              is_default=is_default))

    return ACList(acl=acl)


def parse_gfcksum(data):
    checksums = []
    for line in data.strip().splitlines():
        parts = line.strip().split(maxsplit=3)
        if len(parts) == 4 and "no checksum" not in line:
            cksum, cksum_type, size, path = parts
            parse_cksum_type = re.sub(r"^\((.*)\)$", r"\1", cksum_type)
            checksums.append({"cksum": cksum,
                              "cksum_type": parse_cksum_type,
                              "size": size,
                              "path": path})
    return checksums


#############################################################################
async def gfwhoami(env):
    args = []
    return await asyncio.create_subprocess_exec(
        'gfwhoami', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def gfrm(env, path, force=False, recursive=False):
    args = []
    if force:
        args.append("-f")
    if recursive:
        args.append("-r")
    args.append(path)
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
        stderr=subprocess.DEVNULL), args


async def gfexport(env, path):
    args = [path]
    return await asyncio.create_subprocess_exec(
        'gfexport', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE), args


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
        stderr=asyncio.subprocess.PIPE), args


async def gfls(env,
               path,
               _all=False,
               _recursive=False,
               _long=False,
               _T=False,
               effperm=False):
    args = []
    if _all:
        args.append('-a')
    if _recursive:
        args.append('-R')
    if _long:
        args.append('-l')
    if _T:
        args.append('-T')
    if effperm:
        args.append('-e')
    args.append(path)
    return await asyncio.create_subprocess_exec(
        'gfls', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT)


class Gfls_Entry:
    def __init__(
            self,
            name: Union[str, None] = None,
            nlink: Union[str, None] = None,
            uname: Union[str, None] = None,
            gname: Union[str, None] = None,
            size: Union[str, None] = None,
            dirname: Union[str, None] = None,
            mtime_str: Union[str, None] = None,
            mode_str: Union[str, None] = None,
            perms: Union[str, None] = None):
        self.name = name
        self.nlink = nlink
        self.uname = uname
        self.gname = gname
        self.size = size
        self.perms = perms
        self.set_dirname(dirname)
        self.set_mtime(mtime_str)
        self.set_mode(mode_str)
        self.set_linkname(name, self.is_sym)

    def set_dirname(self, dirname):
        self.dirname = dirname
        if dirname is not None:
            if self.name == "." or self.name is None:
                self.path = dirname
            else:
                self.path = os.path.join(self.dirname, self.name)

    def set_mode(self, mode_str):
        self.mode_str = mode_str
        if mode_str is None:
            self.mode = None
            self.is_dir = None
            self.is_sym = None
            return
        mode = 0
        perm, highbit = from_rwx(mode_str[1:4], 's')
        mode |= (perm << 6)
        mode |= (highbit << 11)
        perm, highbit = from_rwx(mode_str[4:7], 's')
        mode |= (perm << 3)
        mode |= (highbit << 10)
        perm, highbit = from_rwx(mode_str[7:10], 't')
        mode |= perm
        mode |= (highbit << 9)
        self.mode = mode
        self.is_dir = mode_str.startswith('d')
        self.is_sym = mode_str.startswith('l')

    def set_mtime(self, mtime_str):
        self.mtime_str = mtime_str
        if mtime_str is None:
            self.mtime = None
            return
        mtime = time.mktime(
            time.strptime(mtime_str, '%b %d %H:%M:%S %Y'))
        self.mtime = mtime

    def set_linkname(self, name, is_sym):
        self.linkname = ''
        if is_sym is None:
            return
        if is_sym:
            pair = name.split(' -> ')
            self.name = pair[0]
            self.linkname = pair[1]

    def set_line(self, line):
        self.line = line

    def json_dump(self):
        return {
            "mode_str": self.mode_str,
            "is_file": not self.is_dir and not self.is_sym,
            "is_dir": self.is_dir,
            "is_sym": self.is_sym,
            "linkname": self.linkname,
            "nlink": self.nlink,
            "uname": self.uname,
            "gname": self.gname,
            "size": self.size,
            "mtime": self.mtime,
            "name": self.name,
            "path": self.path,
            "perms": self.perms
        }

    def line_dump(self):
        return self.line

    def parse(line,
              is_file, long_format, full_format_time, effperm, dirname=None):
        if not long_format:
            return line

        split_count = 8
        if effperm:
            split_count += 1
        if full_format_time:
            split_count += 1

        parts = line.strip().split(None, split_count)
        if len(parts) < 10:
            return line

        perms = parts.pop(0) if effperm else None
        mode_str = parts.pop(0)
        nlink = int(parts.pop(0))
        uname = parts.pop(0)
        gname = parts.pop(0)
        size = int(parts.pop(0))
        month = parts.pop(0)
        day = parts.pop(0)
        time = parts.pop(0)
        if full_format_time:
            year = parts.pop(0)
            mtime_str = f"{month} {day} {time} {year}"
        else:
            mtime_str = f"{month} {day} {time}"

        name = parts.pop(0)
        new_entry = Gfls_Entry(name, nlink, uname, gname,
                               size, dirname, mtime_str, mode_str, perms)

        if is_file:
            new_entry.name = os.path.basename(new_entry.name)

        new_entry.set_line(line)

        return new_entry


async def gfls_generator(
        env,
        path,
        is_file,
        show_hidden: bool = True,
        recursive: bool = True,
        long_format: bool = True,
        time_format: Literal['full', 'short'] = 'full',
        effperm: bool = False,
        ign_err: bool = False) -> AsyncGenerator[Union[str, Gfls_Entry], None]:
    dirname = os.path.dirname(path) if is_file else path
    p = await gfls(env, path,
                   show_hidden, recursive, long_format, time_format, effperm)
    stdout = ""
    buffer = b""
    is_reading = True
    while is_reading:
        chunk = await p.stdout.read(1)
        if not chunk:
            is_reading = False
            if len(buffer) > 0:
                buffer += b"\n"
        else:
            buffer += chunk
        if b"\r" in buffer or b"\n" in buffer:
            # print(f"buffer:{buffer}")
            line = buffer.decode("utf-8", errors="replace").strip()
            stdout += line
            buffer = b""
            if not line:
                continue
            entry = Gfls_Entry.parse(line=line,
                                     is_file=is_file,
                                     long_format=long_format,
                                     full_format_time=time_format == 'full',
                                     effperm=effperm)
            if isinstance(entry, Gfls_Entry):
                entry.set_dirname(dirname)
                yield entry
                continue
            if recursive:
                dirname = os.path.normpath(line[:-1])
            else:
                yield line

    return_code = await p.wait()
    if not ign_err and return_code != 0:
        raise RuntimeError(stdout)


async def gfmkdir(env, path, p=False):
    args = []
    if p:
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


async def gfln(env, srcpath, linkpath, symlink):
    args = []
    if symlink:
        args.append("-s")
    args.append(srcpath)
    args.append(linkpath)

    return await asyncio.create_subprocess_exec(
        'gfln', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE)


async def gfstat(env, path, metadata, check_symlink=None):
    args = []
    if metadata:
        args.append('-M')
    if check_symlink:
        args.append('-l')
    args.append(path)
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


async def gfcksum(env,
                  cmd: str = None, paths: List[str] = None, host: str = None):
    args = []
    if cmd:
        args.append(f"-{cmd}")
    if paths:
        args.extend(paths)
    if host:
        args.extend(["-h", host])

    return await asyncio.create_subprocess_exec(
        'gfcksum', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE), args


async def gfptar(env,
                 cmd: str,
                 outdir,
                 basedir,
                 src: List[str],
                 options=None):
    args = []
    if options:
        args.extend(options)

    if cmd == "x":
        args.extend([f"-{cmd}", outdir, basedir])
        if len(src) > 0:
            args.extend(src)
    elif cmd == "t":
        args.extend([f"-{cmd}", basedir])
    else:
        args.extend([f"-{cmd}", outdir, "-C", basedir, "--"])
        args.extend(src)

    return await asyncio.create_subprocess_exec(
        'gfptar', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE), args


async def gfuser(env, username: str = None, cmd: str = None):
    args = []
    if cmd:
        args.append(f"-{cmd}")
    if username:
        args.append(username)
    return await asyncio.create_subprocess_exec(
        'gfuser', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE), args


async def gfgroup(env, groupname: str = None, cmd: str = None):
    args = []
    if cmd is not None:
        args.append(f"-{cmd}")
    if groupname is not None:
        args.append(groupname)
    return await asyncio.create_subprocess_exec(
        'gfgroup', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE), args


async def gfsetfacl(env, path,
                    _b=False, _k=False, _n=False, _r=False,
                    acl_spec=None, acl_file=None):
    args = []
    if _b:
        args.append("-b")
    if _k:
        args.append("-k")
    if _n:
        args.append("-n")
    if _r:
        args.append("-r")
    if acl_spec is not None:
        args.extend(["-m", acl_spec])
    elif acl_file is not None:
        args.extend(["-M", acl_file])
    args.append(path)
    return await asyncio.create_subprocess_exec(
        'gfsetfacl', *args,
        env=env,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE), args


async def gfgetfacl(env, path):
    args = [path]
    return await asyncio.create_subprocess_exec(
        'gfgetfacl', *args,
        env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE), args


async def get_username(env):
    p = await gfwhoami(env)
    elist = []
    stderr_task = asyncio.create_task(log_stderr("gfwhoami", p, elist))
    data = await p.stdout.read()
    stdout = data.decode()
    await stderr_task
    return_code = await p.wait()
    if return_code != 0:
        return None
    return stdout.rstrip()


async def get_groupuser(env, groupname):
    p, _ = await gfgroup(env, groupname)
    elist = []
    stderr_task = asyncio.create_task(log_stderr("gfgroup", p, elist))
    data = await p.stdout.read()
    stdout = data.decode()
    await stderr_task
    return_code = await p.wait()
    if return_code != 0:
        return None
    parts = stdout.strip().split(None)
    if len(parts) < 2:
        return []
    return parts[1:]


async def file_size(env, path, extend=False):
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
    if extend:
        return existing, is_file, size, int(st.ModifySeconds)
    else:
        return existing, is_file, size


async def can_access(env, path, check_perm="w"):
    existing, is_file, _ = await file_size(env, path)
    if not existing:
        return False
    async for entry in gfls_generator(env, path, is_file, effperm=True):
        if check_perm in entry.perms:
            return True
    return False


async def match_checksum(env, method, apiname, src, dst, elist):
    # check sum
    paths = [src, dst]
    opname = "gfcksum"
    log_operation(env, method, apiname, opname, src)
    proc_cksum, _ = await gfcksum(env, paths=paths)
    stdout = await read_proc_output(opname, proc_cksum, elist)
    if stdout is None:
        return None, "gfcksum failed"
    cksums = parse_gfcksum(stdout)
    if len(cksums) != 2:
        return None, "no checksum"
    src, dst = cksums
    if src["cksum"] != dst["cksum"]:
        return False, (
            f"checksum mismatch: "
            f'{src["path"]}:{src["cksum"]}({src["cksum_type"]})'
            ' '
            f'{dst["path"]}:{dst["cksum"]}({dst["cksum_type"]})'
        )
    return True, None


async def gfuser_info(env, gfarm_username):
    proc, _ = await gfuser(env, gfarm_username, "l")
    elist = []
    stderr_task = asyncio.create_task(log_stderr("gfuser", proc, elist))
    res = await proc.stdout.read()
    stdout = res.decode()
    await stderr_task
    return_code = await proc.wait()
    if return_code != 0:
        raise RuntimeError(stdout)

    gfarm_info = stdout.split(":", 3)
    if (len(gfarm_info) < 4):
        raise RuntimeError(gfarm_info)
    name = gfarm_info[0]
    authority = gfarm_info[1]
    home_directory = gfarm_info[2]
    identifier = gfarm_info[3]
    return name, authority, home_directory, identifier


async def get_lsinfo(env, path, depth) -> Gfls_Entry:
    if depth > RECURSIVE_MAX_DEPTH:
        raise RuntimeError(
            f"Reached maximum symlink follow limit ({depth})")
    existing, is_file, _ = await file_size(env, path)

    if existing:
        async for entry in gfls_generator(env, path, is_file,
                                          show_hidden=True):
            entry.name = os.path.basename(path)
            if entry.is_sym:
                if ":" in entry.linkname or \
                        entry.linkname.startswith("/"):
                    nextpath = entry.linkname
                else:
                    nextpath = os.path.join(
                        os.path.dirname(path),
                        entry.linkname)
                return await get_lsinfo(env, nextpath, depth + 1)
            return entry
    raise FileNotFoundError(path)


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
            code = status.HTTP_401_UNAUTHORIZED
            message = "Authentication error"
        else:
            code = status.HTTP_500_INTERNAL_SERVER_ERROR
            message = "Internal Server Error"
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


async def read_proc_output(opname, proc, elist):
    stderr_task = asyncio.create_task(log_stderr(opname, proc, elist))
    data = await proc.stdout.read()
    stdout = data.decode()
    await stderr_task
    return_code = await proc.wait()
    if return_code != 0:
        return None
    return stdout


#############################################################################
@app.get("/conf/me")
async def whoami(request: Request,
                 authorization: Union[str, None] = Header(default=None)):
    opname = "gfwhoami"
    apiname = "/conf/me"
    env = await set_env(request, authorization)
    log_operation(env, request.method, apiname, opname, None)
    p = await gfwhoami(env)
    return await gfarm_command_standard_response(env, p, opname)


@app.get("/dir/{gfarm_path:path}")
async def dir_list(gfarm_path: str,
                   request: Request,
                   show_hidden: bool = False,
                   effperm: bool = False,
                   recursive: bool = False,
                   long_format: bool = True,  # noqa: E741
                   time_format: Literal['full', 'short'] = 'full',
                   output_format: Literal['json', 'plain'] = 'json',
                   ign_err: bool = False,
                   authorization: Union[str, None] = Header(default=None)):
    opname = "gfls"
    apiname = "/dir"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    log_operation(env, request.method, apiname, opname, gfarm_path)
    existing, is_file, _ = await file_size(env, gfarm_path)
    if not existing:
        code = status.HTTP_404_NOT_FOUND
        message = f"The requested path does not exist: path={gfarm_path}"
        elist = []
        raise gfarm_http_error(opname, code, message, "", elist)

    output_data = []
    try:
        async for entry in gfls_generator(
                env, gfarm_path, is_file,
                show_hidden=show_hidden,
                recursive=recursive,
                long_format=long_format,
                time_format=time_format,
                effperm=effperm,
                ign_err=ign_err):
            if isinstance(entry, Gfls_Entry):
                if output_format == 'json':
                    output_data.append(entry.json_dump())
                else:
                    output_data.append(entry.line_dump())
            else:
                output_data.append(entry)
    except RuntimeError as e:
        code = status.HTTP_500_INTERNAL_SERVER_ERROR
        message = f"Failed to execute gfls: path={gfarm_path}"
        elist = []
        raise gfarm_http_error(opname, code, message, str(e), elist)

    logger.debug(f"{ipaddr}:0 user={user}, cmd={opname}, stdout={output_data}")
    if output_format == 'json':
        return JSONResponse(content=output_data)

    return PlainTextResponse(content="\n".join(output_data))


@app.get("/symlink/{gfarm_path:path}")
async def get_symlink(gfarm_path: str,
                      request: Request,
                      get_fullpath: bool = False,
                      authorization: Union[str, None] = Header(default=None)):
    apiname = "/symlink"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    elist = []
    try:
        opname = "gfstat"
        log_operation(env, request.method, apiname, opname, gfarm_path)
        metadata = True
        proc = await gfstat(env, gfarm_path, metadata, False)

        stdout = await read_proc_output(opname, proc, elist)
        if stdout is None:
            raise RuntimeError(str(elist))
        st = parse_gfstat(stdout)
        logger.debug("Stat=\n" + pf(st.model_dump()))
        if st.Filetype == "regular file" and not get_fullpath:
            return JSONResponse(content={
                "name": gfarm_path,
                "path": gfarm_path,
                "is_file": True,
                "is_dir": False,
                "is_sym": True
            })

        opname = "gfls"
        log_operation(env, request.method, apiname, opname, gfarm_path)

        lastentry = await get_lsinfo(env, gfarm_path, 0)
        logger.debug(f"{ipaddr}:0 user={user}, cmd={opname}," +
                     f"stdout={lastentry.json_dump()}")
        return JSONResponse(content=lastentry.json_dump())
    except RuntimeError as e:
        code = status.HTTP_500_INTERNAL_SERVER_ERROR
        message = f"Failed to execute gfls: path={gfarm_path}"
        raise gfarm_http_error(opname, code, message, str(e), elist)
    except FileNotFoundError:
        code = status.HTTP_404_NOT_FOUND
        message = f"The requested path does not exist: path={gfarm_path}"
        raise gfarm_http_error(opname, code, message, "", elist)


class FileOperation(BaseModel):
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


@app.post("/symlink")
async def symlink_create(
        symlink_data: FileOperation,
        request: Request,
        symlink: bool = True,
        authorization: Union[str, None] = Header(default=None)):
    opname = "gfln"
    apiname = "/symlink"
    gfarm_path = symlink_data.source
    symlink_path = symlink_data.destination
    env = await set_env(request, authorization)
    log_operation(env, request.method, apiname, opname, gfarm_path)
    proc = await gfln(env, gfarm_path, symlink_path, symlink)
    return await gfarm_command_standard_response(env, proc, opname)


@app.put("/dir/{gfarm_path:path}")
async def dir_create(gfarm_path: str,
                     request: Request,
                     p: bool = False,
                     authorization: Union[str, None] = Header(default=None),
                     x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    opname = "gfmkdir"
    apiname = "/dir"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    log_operation(env, request.method, apiname, opname, gfarm_path)
    proc = await gfmkdir(env, gfarm_path, p)
    return await gfarm_command_standard_response(env, proc, opname)


@app.delete("/dir/{gfarm_path:path}")
async def dir_remove(gfarm_path: str,
                     request: Request,
                     authorization: Union[str, None] = Header(default=None),
                     x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    opname = "gfrmdir"
    apiname = "/dir"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    log_operation(env, request.method, apiname, opname, gfarm_path)
    p = await gfrmdir(env, gfarm_path)
    return await gfarm_command_standard_response(env, p, opname)


# BUFSIZE = 1
# BUFSIZE = 65536
BUFSIZE = 1024 * 1024

ASYNC_GFEXPORT = str2bool(conf.GFARM_HTTP_ASYNC_GFEXPORT)


@app.get("/file/{gfarm_path:path}")
async def file_export(gfarm_path: str,
                      request: Request,
                      action: str = 'view',
                      authorization: Union[str, None] = Header(default=None)):
    opname = "gfexport"
    apiname = "/file"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    log_operation(env, request.method, apiname, opname, gfarm_path)
    existing, is_file, size = await file_size(env, gfarm_path)
    if not existing:
        code = status.HTTP_404_NOT_FOUND
        message = "The requested URL does not exist."
        stdout = ""
        elist = []
        raise gfarm_http_error(opname, code, message, stdout, elist)
    if not is_file:
        code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        message = "The requested URL does not represent a file."
        stdout = ""
        elist = []
        raise gfarm_http_error(opname, code, message, stdout, elist)

    if int(size) <= 0:
        return Response(status_code=204)  # 0 byte OK

    env = await set_env(request, authorization)  # may refresh
    if ASYNC_GFEXPORT:
        p, args = await gfexport(env, gfarm_path)
        elist = []
        stderr_task = asyncio.create_task(log_stderr(opname, p, elist))
    else:
        # stderr is not supported
        p, args = sync_gfexport(env, gfarm_path)

    # size > 0
    if ASYNC_GFEXPORT:
        first_byte = await p.stdout.read(1)
    else:
        first_byte = p.stdout.read(1)
    if not first_byte:
        if ASYNC_GFEXPORT:
            await stderr_task
        if await can_access(env, gfarm_path, "r"):
            code = status.HTTP_403_FORBIDDEN
            message = f"Cannot read: path={gfarm_path}"
        else:
            code = status.HTTP_500_INTERNAL_SERVER_ERROR
            message = f"Failed to execute: gfexport {' '.join(args)}"
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


class ZipStreamWriter:
    """
    Stream-like writer for ZipFile that supports async chunk consumption.
    """
    def __init__(self, chunk_size: int = BUFSIZE,
                 loop: Optional[asyncio.AbstractEventLoop] = None):
        self._buffer = deque()  # A queue for storing byte chunks
        self._closed = False
        self._chunk_size = chunk_size
        self._current_chunk = bytearray()
        self._condition = asyncio.Condition()
        self._lock = threading.Lock()
        self._loop = loop or asyncio.get_running_loop()

    def write(self, data: bytes) -> int:
        if self._closed:
            raise ValueError("I/O operation on closed file.")

        self._current_chunk.extend(data)
        if len(self._current_chunk) >= self._chunk_size:
            with self._lock:
                while len(self._current_chunk) >= self._chunk_size:
                    self._buffer.append(
                        bytes(self._current_chunk[:self._chunk_size]))
                    del self._current_chunk[:self._chunk_size]
            self._loop.create_task(self._notify())

        return len(data)

    async def _notify(self):
        async with self._condition:
            self._condition.notify_all()

    async def get_chunks(self) -> AsyncGenerator[bytes, None]:
        while not self._closed or self._buffer:
            async with self._condition:
                if not self._buffer:
                    await self._condition.wait()
                with self._lock:
                    while self._buffer:
                        yield self._buffer.popleft()
        # Flush remaining data on exit
        if self._current_chunk:
            yield bytes(self._current_chunk)

    def close(self):
        self._closed = True
        self._loop.create_task(self._notify())

    def flush(self):
        pass


@app.post("/zip")
async def zip_export(request: Request,
                     paths: List[str] = Form(...),
                     authorization: Union[str, None] = Header(default=None)):
    opname = "gfexport"
    apiname = "/zip"
    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    log_operation(env, request.method, apiname, opname, paths)
    filedatas = []
    for filepath in paths:
        existing, is_file, _ = await file_size(env, filepath)
        if not existing:
            code = status.HTTP_404_NOT_FOUND
            message = f"The requested URL does not exist: {filepath}"
            stdout = ""
            elist = []
            raise gfarm_http_error(opname, code, message, stdout, elist)
        filedatas.append((filepath, is_file))

    async def add_entry_to_zip(zipf: zipfile.ZipFile, entry: Gfls_Entry):
        rel_path = os.path.join(entry.dirname, entry.name)
        logger.debug(f"rel_path {rel_path}")

        zipinfo = zipfile.ZipInfo(filename=rel_path)
        zipinfo.date_time = time.localtime(entry.mtime)[:6]
        zipinfo.compress_type = zipfile.ZIP_DEFLATED
        zipinfo.external_attr = (entry.mode & 0xFFFF) << 16

        if entry.is_sym:
            zipinfo.create_system = 3  # Unix
            zipinfo.external_attr |= 0xA000 << 16  # symlink bit
            zipf.writestr(zipinfo, entry.linkname.encode())
        elif entry.is_dir:
            zipinfo.external_attr |= 0x4000 << 16  # directory bit
            if not rel_path.endswith('/'):
                zipinfo.filename += '/'
            zipf.writestr(zipinfo, b'')
        else:
            try:
                env = await set_env(request, authorization)
                proc, _ = await gfexport(env, entry.path)
                elist = []
                stderr_task = asyncio.create_task(
                    log_stderr(opname, proc, elist))
                with zipf.open(zipinfo, 'w') as dest:
                    while True:
                        chunk = await proc.stdout.read(BUFSIZE)
                        if not chunk:
                            break
                        dest.write(chunk)
                await stderr_task
                return_code = await proc.wait()
                if return_code != 0:
                    raise
            except Exception as e:
                message = f"zip create error: path={entry.path}: {str(e)}"
                logger.debug(
                    f"{ipaddr}:0 user={user}, cmd={opname}, " +
                    f" message={message}")
                return

    async def create_zip(zip_writer):
        try:
            with zipfile.ZipFile(zip_writer, "w",
                                 compression=zipfile.ZIP_DEFLATED) as zf:
                for filepath, is_file in filedatas:
                    parent = os.path.dirname(filepath)
                    async for entry in gfls_generator(env, filepath, is_file):
                        if entry.name == "." or entry.name == "..":
                            continue
                        dirname = entry.dirname
                        if dirname.startswith(parent):
                            dirname = dirname.replace(parent, "", 1)
                        if dirname.startswith("/"):
                            dirname = dirname[1:]
                        dirname = os.path.normpath(dirname)
                        entry.dirname = dirname
                        await add_entry_to_zip(zf, entry)
        finally:
            zip_writer.close()

    async def generate():
        zip_writer = ZipStreamWriter(chunk_size=BUFSIZE,
                                     loop=asyncio.get_running_loop())
        asyncio.create_task(create_zip(zip_writer))
        async for chunk in zip_writer.get_chunks():
            yield chunk

    zipname = 'download_' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.zip'
    headers = {"Content-Disposition": f'attachment; filename="{zipname}"'}
    return StreamingResponse(
        content=generate(),
        media_type="application/zip",
        headers=headers)


@app.put("/file/{gfarm_path:path}")
async def file_import(gfarm_path: str,
                      request: Request,
                      x_file_timestamp:
                      Union[str, None] = Header(default=None),
                      authorization: Union[str, None] = Header(default=None),
                      x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    # TODO overwrite=1, defaut 0
    opname = "gfreg"
    apiname = "/file"
    gfarm_path = fullpath(gfarm_path)
    filename = os.path.basename(gfarm_path)
    dirname = os.path.dirname(gfarm_path)
    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    log_operation(env, request.method, apiname, opname, gfarm_path)

    # NOTE: MAXNAMLEN == 255
    filename_prefix = filename[:128]

    choices = string.ascii_letters + string.digits
    randstr = ''.join(random.choices(choices, k=8))
    tmpname = "gfarm-http.upload." + filename_prefix + "." + randstr
    tmppath = os.path.join(dirname, tmpname)

    p, args = await gfreg(env, tmppath, x_file_timestamp)
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

    code = status.HTTP_500_INTERNAL_SERVER_ERROR
    if error:
        message = f"I/O error({str(error)}): path={gfarm_path}"
    else:
        message = f"Failed to execute: gfreg {' '.join(args)}"
    stdout = ""
    raise gfarm_http_error(opname, code, message, stdout, elist)


@app.delete("/file/{gfarm_path:path}")
async def file_remove(gfarm_path: str,
                      request: Request,
                      force: bool = False,
                      recursive: bool = False,
                      authorization: Union[str, None] = Header(default=None),
                      x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    opname = "gfrm"
    apiname = "/file"
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    log_operation(env, request.method, apiname, opname, gfarm_path)
    p = await gfrm(env, gfarm_path, force, recursive)
    return await gfarm_command_standard_response(env, p, opname)


@app.post("/copy")
async def file_copy(copy_data: FileOperation,
                    request: Request,
                    authorization: Union[str, None] = Header(default=None)):
    opname = "gfexport"
    apiname = "/copy"
    gfarm_path = copy_data.source
    dest_path = copy_data.destination
    dest_dir = os.path.dirname(dest_path)
    dest_filename = os.path.basename(dest_path)

    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    elist = []

    log_operation(env, request.method, apiname, opname, gfarm_path)

    existing, is_file, size, mtime = await file_size(env, gfarm_path, True)
    if not existing:
        code = status.HTTP_404_NOT_FOUND
        message = "The requested URL does not exist."
        stdout = ""
        elist = []
        raise gfarm_http_error(opname, code, message, stdout, elist)
    if not is_file:
        code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        message = "The requested URL does not represent a file."
        stdout = ""
        elist = []
        raise gfarm_http_error(opname, code, message, stdout, elist)

    filename_prefix = dest_filename[:128]
    randstr = ''.join(
        random.choices(string.ascii_letters + string.digits, k=8))
    tmpname = f"gfarm-http.copy.{filename_prefix}.{randstr}"
    tmppath = os.path.join(dest_dir, tmpname)

    p_export, args = await gfexport(env, gfarm_path)
    stderr_export = asyncio.create_task(
        log_stderr("gfexport", p_export, elist))
    first_byte = await p_export.stdout.read(1)
    if not first_byte:
        await stderr_export
        if await can_access(env, gfarm_path, "r"):
            code = status.HTTP_403_FORBIDDEN
            message = f"Cannot read: {gfarm_path}"
        else:
            code = status.HTTP_500_INTERNAL_SERVER_ERROR
            message = f"Failed to execute: gfexport {' '.join(args)}"
        stdout = ""
        raise gfarm_http_error(opname, code, message, stdout, elist)

    p_reg, _ = await gfreg(env, tmppath, mtime)
    stderr_reg = asyncio.create_task(log_stderr("gfreg", p_reg, elist))
    opname = "gfreg"
    log_operation(env, request.method, apiname, opname, gfarm_path)
    current_status = {"copied": 0,
                      "total": size,
                      "warn": None,
                      "error": None,
                      "done": False}

    async def progress_generator():
        copied = 1
        p_reg.stdin.write(first_byte)
        await p_reg.stdin.drain()
        current_status["copied"] = copied
        yield json.dumps(current_status) + "\n"
        try:
            while True:
                chunk = await p_export.stdout.read(BUFSIZE)
                if not chunk:
                    break
                p_reg.stdin.write(chunk)
                await p_reg.stdin.drain()
                copied += len(chunk)
                # yield JSON line
                current_status["copied"] = copied
                yield json.dumps(current_status) + "\n"
        except Exception:
            yield json.dumps({"error": "I/O error", "done": True}) + "\n"
            raise
        finally:
            p_reg.stdin.close()

        await stderr_export
        await stderr_reg
        return_code_export = await p_export.wait()
        return_code_reg = await p_reg.wait()

        if return_code_reg == 0:
            ok, error_message = await match_checksum(
                env, request.method, apiname, gfarm_path, tmppath, elist)
            if ok is None:
                current_status["warn"] = error_message
                yield json.dumps(current_status) + "\n"
            elif not ok:
                # cleanup
                p_clean = await gfrm(env, tmppath, force=True)
                await asyncio.create_task(log_stderr("gfrm", p_clean, elist))
                await p_clean.wait()
                current_status["error"] = error_message
                current_status["done"] = True
                yield json.dumps(current_status) + "\n"
                return

        if return_code_export != 0 or return_code_reg != 0:
            logger.debug(f"{ipaddr}:0 user={user}, cmd=",
                         "gfexport" if return_code_export != 0 else "gfreg"
                         f", path={tmppath}, "
                         f"return={return_code_export | return_code_reg}")
            # cleanup
            p_clean = await gfrm(env, tmppath, force=True)
            await asyncio.create_task(log_stderr("gfrm", p_clean, elist))
            await p_clean.wait()
            current_status["error"] = "copy failed"
            current_status["done"] = True
            yield json.dumps(current_status) + "\n"
            return

        # final move
        p_mv = await gfmv(env, tmppath, dest_path)
        stderr_mv = asyncio.create_task(log_stderr("gfmv", p_mv, elist))
        opname = "gfmv"
        log_operation(env, request.method, apiname, opname, gfarm_path)
        await stderr_mv
        return_code_mv = await p_mv.wait()

        if return_code_mv == 0:
            ok, error_message = await match_checksum(
                env, request.method, apiname, gfarm_path, dest_path, elist)
            current_status["warn"] = error_message if ok is None else None
            current_status["error"] = None if ok is None else error_message
            current_status["done"] = True
            yield json.dumps(current_status) + "\n"
        else:
            p_clean = await gfrm(env, tmppath, force=True)
            await asyncio.create_task(log_stderr("gfrm", p_clean, elist))
            await p_clean.wait()
            current_status["error"] = "move failed"
            current_status["done"] = True
            yield json.dumps(current_status) + "\n"

    return StreamingResponse(progress_generator(),
                             media_type="application/json")


@app.post("/move")
async def move_rename(request: Request,
                      move_data: FileOperation,
                      authorization: Union[str, None] = Header(default=None),
                      x_csrf_token: Union[str, None] = Header(default=None)):
    check_csrf(request, x_csrf_token)
    opname = "gfmv"
    apiname = "/move"
    src = move_data.source
    dest = move_data.destination
    env = await set_env(request, authorization)
    log_operation(env, request.method, apiname, opname,
                  {"src": src, "dest": dest})
    p = await gfmv(env, src, dest)
    return await gfarm_command_standard_response(env, p, opname)


@app.get("/attr/{gfarm_path:path}")
async def get_attr(gfarm_path: str,
                   request: Request,
                   check_sum: bool = False,
                   check_symlink: bool = False,
                   authorization: Union[str, None] = Header(default=None)
                   ) -> Stat:
    opname = "gfstat"
    apiname = "/attr"
    gfarm_path = fullpath(gfarm_path)
    result_json = {}
    stdout = ""
    elist = []
    try:
        env = await set_env(request, authorization)
        user = get_user_from_env(env)
        ipaddr = get_client_ip_from_env(env)
        log_operation(env, request.method, apiname, opname, gfarm_path)
        logger.debug(f"{ipaddr}:0 user={user}, "
                     f"cmd={opname}, path={gfarm_path}")
        metadata = True
        proc = await gfstat(env, gfarm_path, metadata, check_symlink)

        stdout = await read_proc_output(opname, proc, elist)
        if stdout is None:
            raise Exception(str(elist))
        st = parse_gfstat(stdout)
        logger.debug("Stat=\n" + pf(st.model_dump()))
        result_json = st.model_dump()

        if check_symlink and st.Filetype == "symbolic link":
            try:
                opname = "gfls"
                log_operation(env, request.method, apiname, opname, gfarm_path)
                logger.debug(
                    f"{ipaddr}:0 user={user}, cmd={opname}, path={gfarm_path}")
                lastentry = await get_lsinfo(env, gfarm_path, 0)
                result_json["LinkPath"] = lastentry.path
            except FileNotFoundError as err:
                result_json["LinkPath"] = str(err)
            except Exception as err:
                logger.debug(
                    f"{ipaddr}:0 user={user}, cmd={opname}, {str(err)}")

        if check_sum:
            opname = "gfcksum"
            env = await set_env(request, authorization)  # may refresh
            log_operation(env, request.method, apiname, opname, gfarm_path)
            logger.debug(
                f"{ipaddr}:0 user={user}, cmd={opname}, path={gfarm_path}")
            proc_cksum, args = await gfcksum(env, paths=[gfarm_path])

            stdout = await read_proc_output(opname, proc_cksum, elist)
            if stdout is None:
                raise Exception(' '.join(args))
            cksums = parse_gfcksum(stdout)
            if len(cksums) > 0:
                result_json["Cksum"] = cksums[0]["cksum"]
                result_json["CksumType"] = cksums[0]["cksum_type"]
            else:
                result_json["Cksum"] = ""
                result_json["CksumType"] = ""

        return JSONResponse(content=result_json)

    except Exception as err:
        if "authentication error" in str(elist):
            code = status.HTTP_401_UNAUTHORIZED
            message = "Authentication error"
            raise gfarm_http_error(opname, code, message, stdout, elist)
        else:
            code = status.HTTP_500_INTERNAL_SERVER_ERROR
            message = f"Internal Server Error ({opname} {str(err)})"
            raise gfarm_http_error(opname, code, message, stdout, elist)


@app.post("/attr/{gfarm_path:path}")
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
    apiname = "/attr"
    if stat.Mode:
        opname = "gfchmod"
        log_operation(env, request.method, apiname, opname,
                      (stat.Mode, gfarm_path))
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


@app.get("/acl/{gfarm_path:path}")
async def get_acl(gfarm_path: str,
                  request: Request,
                  authorization: Union[str, None] = Header(default=None),
                  x_csrf_token: Union[str, None] = Header(default=None)):
    opname = "gfgetfacl"
    apiname = "/acl"
    check_csrf(request, x_csrf_token)
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    log_operation(env, request.method, apiname, opname, "")
    logger.debug(f"{ipaddr}:0 user={user}, cmd={opname}, path={gfarm_path}")
    proc, args = await gfgetfacl(env, gfarm_path)
    elist = []
    stderr_task = asyncio.create_task(log_stderr("gfgetfacl", proc, elist))
    data = await proc.stdout.read()
    stdout = data.decode()
    await stderr_task
    return_code = await proc.wait()
    if return_code != 0:
        code = status.HTTP_500_INTERNAL_SERVER_ERROR
        message = f"Failed to execute: gfgetfacl {' '.join(args)}"
        raise gfarm_http_error(opname, code, message, stdout, elist)
    acl = parse_gfgetfacl(stdout)
    if acl is None:
        code = status.HTTP_500_INTERNAL_SERVER_ERROR
        message = f"Failed to parse {stdout}"
        raise gfarm_http_error(opname, code, message, stdout, elist)
    return JSONResponse(content=acl.model_dump())


@app.post("/acl/{gfarm_path:path}")
async def set_acl(gfarm_path: str,
                  acl: ACList,
                  request: Request,
                  authorization: Union[str, None] = Header(default=None),
                  x_csrf_token: Union[str, None] = Header(default=None)):
    opname = "gfsetfacl"
    apiname = "/acl"
    check_csrf(request, x_csrf_token)
    gfarm_path = fullpath(gfarm_path)
    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    logger.debug(f"{ipaddr}:0 user={user}, cmd={opname}, path={gfarm_path}")
    log_operation(env, request.method, apiname, opname, acl)
    acl_str = acl.make_acl_str("\n") + "\n"
    proc, args = await gfsetfacl(env, gfarm_path, _b=True, acl_file="-")
    stdout, _ = await proc.communicate(input=acl_str.encode())
    elist = []
    stdout = stdout.decode()
    return_code = await proc.wait()
    if return_code != 0:
        code = status.HTTP_500_INTERNAL_SERVER_ERROR
        message = f"Failed to execute: gfsetfacl {' '.join(args)}"
        raise gfarm_http_error(opname, code, message, stdout, elist)
    return PlainTextResponse(content=stdout)


async def get_name_list(request: Request,
                        authorization: Union[str, None],
                        x_csrf_token: Union[str, None],
                        opname: str,
                        apiname: str,
                        exec_func: Callable,
                        command: str = None,
                        username: str = None):
    check_csrf(request, x_csrf_token)
    env = await set_env(request, authorization)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    logger.debug(f"{ipaddr}:0 user={user}, cmd={opname},")
    log_operation(env, request.method, apiname, opname, "")

    proc, args = await exec_func(env, username, command)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(opname, proc, elist))
    data = await proc.stdout.read()
    stdout = data.decode()
    await stderr_task
    return_code = await proc.wait()

    if return_code != 0:
        code = status.HTTP_500_INTERNAL_SERVER_ERROR
        message = f"Failed to execute: {opname} {' '.join(args)}"
        raise gfarm_http_error(opname, code, message, stdout, elist)

    items = [line.strip() for line in stdout.splitlines() if line.strip()]
    return items


@app.get("/users")
async def get_usernames(request: Request,
                        long_format: bool = False,
                        authorization: Union[str, None] = Header(default=None),
                        x_csrf_token: Union[str, None] = Header(default=None)):
    opname = "gfuser",
    apiname = "/users",
    command = "l" if long_format else None
    name_list = await get_name_list(request=request,
                                    authorization=authorization,
                                    x_csrf_token=x_csrf_token,
                                    opname=opname, apiname=apiname,
                                    exec_func=gfuser, command=command)

    if long_format:
        name_entries = []
        for entry in name_list:
            parts = entry.split(':')
            if len(parts) < 4:
                continue
            entry_dict = {
                'id': parts[0],
                'name': parts[1],
                'home_directory': parts[2],
                'identifier': parts[3]
            }
            name_entries.append(entry_dict)
        return JSONResponse(content={"list": name_entries})
    else:
        print("name_list", name_list)
        return JSONResponse(content={"list": name_list})


@app.get("/groups")
async def get_groups(request: Request,
                     long_format: bool = False,
                     authorization: Union[str, None] = Header(default=None),
                     x_csrf_token: Union[str, None] = Header(default=None)):
    opname = "gfgroup",
    apiname = "/groups",
    command = "l" if long_format else None
    name_list = await get_name_list(request=request,
                                    authorization=authorization,
                                    x_csrf_token=x_csrf_token,
                                    opname=opname, apiname=apiname,
                                    exec_func=gfgroup, command=command)
    if long_format:
        name_entries = []
        for entry in name_list:
            parts = entry.split(':')
            if len(parts) < 2:
                continue
            entry_dict = {
                'group': parts[0],
                'menbers': parts[1]
            }
            name_entries.append(entry_dict)
        return JSONResponse(content={"list": name_entries})
    else:
        return JSONResponse(content={"list": name_list})


class Tar(BaseModel):
    command: str
    basedir: str
    source: List[str]
    outdir: str
    options: List[str] | None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "command": "c",
                    "basedir": "/",
                    "source": ["./tmp"],
                    "outdir": "/tmp2",
                    "options": ["--jobs=4"]

                }
            ]
        }
    }


@app.post("/gfptar")
async def archive_files(
        request: Request,
        tar_data: Tar,
        authorization: Union[str, None] = Header(default=None)):
    opname = "gfptar"
    apiname = "/gfptar"
    env = await set_env(request, authorization)
    # Set the token file path in env for long-term exec
    # (updated in progress_generator())
    tokenfilepath, env, expire = await set_tokenfilepath_to_env(request, env)
    user = get_user_from_env(env)
    ipaddr = get_client_ip_from_env(env)
    log_operation(env, request.method, apiname, opname, tar_data)

    tar_dict = tar_data.model_dump()
    cmd = tar_dict.get("command", None)
    if cmd == "create" or cmd == "update":
        cmd = cmd[0]
    elif cmd == "extract":
        cmd = "x"
    elif cmd == "list":
        cmd = "t"
    elif cmd == "append":
        cmd = "r"

    basedir = tar_dict.get("basedir", None)
    src = tar_dict.get("source", None)
    outdir = tar_dict.get("outdir", None)
    options = tar_dict.get("options", None)

    existing, _, _ = await file_size(env, basedir if cmd == 't' else outdir)
    if cmd == 'c' or cmd == 'x':
        if existing:
            code = status.HTTP_403_FORBIDDEN
            message = f"Output directory already exists : path={outdir}"
            stdout = ""
            raise gfarm_http_error(opname, code, message, stdout, [])
    else:
        if not existing:
            code = status.HTTP_404_NOT_FOUND
            if cmd == 't':
                message = f"Input directory does not exist : path={basedir}"
            else:
                message = f"Output directory does not exist : path={outdir}"
            stdout = ""
            raise gfarm_http_error(opname, code, message, stdout, [])

    p, args = await gfptar(env, cmd, outdir, basedir, src, options)
    elist = []
    stderr_task = asyncio.create_task(log_stderr(opname, p, elist))

    first_byte = await p.stdout.read(1)
    if not first_byte:
        await stderr_task
        code = status.HTTP_500_INTERNAL_SERVER_ERROR
        message = f"Failed to execute: gfptar {' '.join(args)}"
        stdout = ""
        raise gfarm_http_error(opname, code, message, stdout, elist)

    async def progress_generator():
        try:
            exp = expire
            buffer = first_byte
            if b"\r" in buffer or b"\n" in buffer:
                yield json.dumps({"message": ""}) + '\n'
                buffer = b""
            while True:
                chunk = await p.stdout.read(1)
                if not chunk:
                    break
                buffer += chunk
                logger.debug(f"buffer:{buffer}")
                if b"\r" in buffer or b"\n" in buffer:
                    msg = buffer.decode("utf-8", errors="replace").strip()
                    buffer = b""
                    j_line = json.dumps({"message": msg})
                    yield j_line + '\n'
                    logger.debug(
                        f"{ipaddr}:0 user={user}, cmd={opname}, json={j_line}")
                    # Update access_token
                    _, _, exp = await set_tokenfilepath_to_env(
                        request, env, tokenfilepath, exp)
            await stderr_task
            return_code = await p.wait()
            if return_code != 0:
                stdout = buffer.decode("utf-8", errors="replace").strip()
                logger.error(
                    f"{ipaddr}:0 user={user}, cmd={opname}, {stdout}")
        except asyncio.CancelledError:
            p.terminate()
            logger.error(
                f"{ipaddr}:0 user={user}, cmd={opname}, Client disconnected")
        finally:
            try:
                if tokenfilepath:
                    os.remove(tokenfilepath)
            except Exception as e:
                logger.error(
                    f"{ipaddr}:0 user={user}, cmd={opname},"
                    + f"os.remove({tokenfilepath}) error: {e}")

    return StreamingResponse(content=progress_generator(),
                             media_type='application/json')
