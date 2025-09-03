# myapp/workers.py
from starlette.config import Config
from uvicorn.workers import UvicornWorker

config = Config()  # reads env vars


class ConfigurableWorker(UvicornWorker):
    CONFIG_KWARGS = {
        "root_path": config("ROOT_NAME", default=""),
        "proxy_headers": True,
        # optional but useful behind reverse proxies:
        "forwarded_allow_ips": "*",
    }
