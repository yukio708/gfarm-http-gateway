import base64

import asyncio
from fastapi.testclient import TestClient
import pytest
import pytest_asyncio
from unittest.mock import patch, Mock

from gfarm_api import app


client = TestClient(app)

req_headers_oidc_auth = {"Authorization": "Bearer TEST_TOKEN"}

userpass_str = "TESTUSER123:PASSWORD123"
userpass_b64_bin = base64.b64encode(userpass_str.encode())
userpass_b64_str = userpass_b64_bin.decode()
req_headers_basic_auth = {"Authorization": "Basic " + userpass_b64_str}

req_headers_anon_auth = {}


@pytest.fixture
def mock_claims():
    with patch("jose.jwt.get_unverified_claims") as mock:
        mock.return_value = {
            "sub": "testuser",
        }
        yield mock


@pytest.fixture
def mock_anon():
    with patch("gfarm_api.ALLOW_ANONYMOUS") as mock:
        mock = "yes"
        yield mock


# class patch_exec(object):
#     def __init__(self, stdout=None, stderr=None):
#         self.stdout = stdout
#         self.stderr = stderr
#         self.patch = patch('asyncio.create_subprocess_exec')

#     def __enter__(self):
#         mock = self.patch.__enter__()

#         # Dummy asyncio.subprocess.Process
#         mock_proc = Mock()
#         mock_proc.stdout = asyncio.StreamReader()
#         if self.stdout is not None:
#             mock_proc.stdout.feed_data(self.stdout)
#         mock_proc.stdout.feed_eof()
#         mock_proc.stderr = asyncio.StreamReader()
#         if self.stderr is not None:
#             mock_proc.stderr.feed_data(self.stderr)
#         mock_proc.stderr.feed_eof()
#         mock_future_wait = asyncio.Future()
#         mock_proc.wait.return_value = mock_future_wait
#         mock_future_wait.set_result(0)
#         mock.return_value = mock_proc
#         return mock

#     def __exit__(self, *exc_info):
#         return self.patch.__exit__(*exc_info)


# @pytest.mark.asyncio
# async def test_whoami0(mock_claims):
#     with patch_exec(stdout=b'testuser'):
#         response = client.get("/conf/me", headers=req_headers_oidc)
#         assert response.status_code == 200
#         assert response.text == "testuser"
#         # assert response.json() == {"name": "Test"}


# See: https://docs.pytest.org/en/latest/example/parametrize.html#apply-indirect-on-particular-arguments  # noqa: E501
@pytest_asyncio.fixture(scope="function")
async def mock_exec(request):
    # expected parameters
    stdout, stderr, result = request.param
    with patch('asyncio.create_subprocess_exec') as mock:
        # Dummy asyncio.subprocess.Process
        mock_proc = Mock()
        mock_proc.stdout = asyncio.StreamReader()
        if stdout is not None:
            mock_proc.stdout.feed_data(stdout)
        mock_proc.stdout.feed_eof()
        mock_proc.stderr = asyncio.StreamReader()
        if stderr is not None:
            mock_proc.stderr.feed_data(stderr)
        mock_proc.stderr.feed_eof()
        mock_future_wait = asyncio.Future()
        mock_proc.wait.return_value = mock_future_wait
        mock_future_wait.set_result(result)
        mock.return_value = mock_proc
        yield mock


def assert_is_oidc_auth(kwargs):
    env = kwargs.get("env")
    mech = env.get("GFARM_SASL_MECHANISMS")
    assert mech == "XOAUTH2"


def assert_is_basic_auth(kwargs):
    env = kwargs.get("env")
    mech = env.get("GFARM_SASL_MECHANISMS")
    assert mech == "PLAIN"
    user = env.get("GFARM_SASL_USER")
    assert user == "TESTUSER123"
    passwd = env.get("GFARM_SASL_PASSWORD")
    assert passwd == "PASSWORD123"


def assert_is_anon_auth(kwargs):
    env = kwargs.get("env")
    mech = env.get("GFARM_SASL_MECHANISMS")
    assert mech == "ANONYMOUS"


expect_gfwhoami_stdout = "testuser"
expect_gfwhoami = (expect_gfwhoami_stdout.encode(), b"error", 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami_oidc_auth(mock_claims, mock_exec):
    response = client.get("/conf/me", headers=req_headers_oidc_auth)
    args, kwargs = mock_exec.call_args
    assert args == ('gfwhoami',)
    assert_is_oidc_auth(kwargs)
    assert response.status_code == 200
    assert response.text == expect_gfwhoami_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami_basic_auth(mock_claims, mock_exec):
    response = client.get("/conf/me", headers=req_headers_basic_auth)
    args, kwargs = mock_exec.call_args
    assert args == ('gfwhoami',)
    assert_is_basic_auth(kwargs)
    assert response.status_code == 200
    assert response.text == expect_gfwhoami_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami_anon_auth_enabled(mock_anon, mock_claims, mock_exec):
    # GFARM_HTTP_ALLOW_ANONYMOUS=yes
    response = client.get("/conf/me", headers=req_headers_anon_auth)
    args, kwargs = mock_exec.call_args
    assert args == ('gfwhoami',)
    assert_is_anon_auth(kwargs)
    assert response.status_code == 200
    assert response.text == expect_gfwhoami_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami_anon_auth_disabled(mock_claims, mock_exec):
    # GFARM_HTTP_ALLOW_ANONYMOUS=no (default)
    response = client.get("/conf/me", headers=req_headers_anon_auth)
    assert response.status_code == 401


expect_gfls_stdout = "test gfls stdout"
expect_gfls = (expect_gfls_stdout.encode(), b"error", 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls)], indirect=True)
async def test_dir_list(mock_claims, mock_exec):
    response = client.get("/dir/testdir", headers=req_headers_oidc_auth)
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '/testdir')
    assert response.status_code == 200
    assert response.text == expect_gfls_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls)], indirect=True)
async def test_dir_list_a(mock_claims, mock_exec):
    response = client.get("/dir/testdir?a=1", headers=req_headers_oidc_auth)
    # NOT WORK: mock_exec.assert_called_with(args=['gfls', '-a', 'testdir'])
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '-a', '/testdir')
    assert response.status_code == 200
    assert response.text == expect_gfls_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls)], indirect=True)
async def test_dir_list_R(mock_claims, mock_exec):
    response = client.get("/dir/testdir?R=1", headers=req_headers_oidc_auth)
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '-R', '/testdir')
    assert response.status_code == 200
    assert response.text == expect_gfls_stdout


expect_gfls_err_msg = "test gfls (error)"
expect_gfls_err = (expect_gfls_err_msg.encode(), b"error", 1)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls_err)], indirect=True)
async def test_dir_list_err(mock_claims, mock_exec):
    response = client.get("/dir/testdir", headers=req_headers_oidc_auth)
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '/testdir')
    assert response.status_code == 500
    assert response.json() == {"detail": expect_gfls_err_msg}


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls_err)], indirect=True)
async def test_dir_list_ign_err(mock_claims, mock_exec):
    response = client.get("/dir/testdir?ign_err=1",
                          headers=req_headers_oidc_auth)
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '/testdir')
    assert response.status_code == 200
    assert response.text == expect_gfls_err_msg


expect_gfmkdir_stdout = ""
expect_gfmkdir = (expect_gfmkdir_stdout.encode(), b"", 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfmkdir)], indirect=True)
async def test_dir_create(mock_claims, mock_exec):
    response = client.put("/dir/testdir", headers=req_headers_oidc_auth)
    args, kwargs = mock_exec.call_args
    assert args == ('gfmkdir', '/testdir')
    assert response.status_code == 200
    assert response.text == expect_gfmkdir_stdout
