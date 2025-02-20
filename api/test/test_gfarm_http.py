import base64

import asyncio
from fastapi.testclient import TestClient
import pytest
import pytest_asyncio
from unittest.mock import patch, Mock

import gfarm_http


client = TestClient(gfarm_http.app)

test_access_token = "TEST_access_token"
req_headers_oidc_auth = {"Authorization": f"Bearer {test_access_token}"}

user_claim = "testuser1"

userpass_str = "TESTUSER123:PASSWO:RD123"  # allow colon in password
userpass_b64_bin = base64.b64encode(userpass_str.encode())
userpass_b64_str = userpass_b64_bin.decode()
req_headers_basic_auth = {"Authorization": "Basic " + userpass_b64_str}

req_headers_anon_auth = {}


@pytest.fixture
def mock_claims():
    with patch("jose.jwt.get_unverified_claims") as mock:
        mock.return_value = {
            "sub": user_claim,
        }
        yield mock


@pytest.fixture
def mock_anon():
    with patch("gfarm_http.ALLOW_ANONYMOUS") as mock:
        mock = "yes"
        yield mock


@pytest.fixture
def mock_access_token():
    with patch("gfarm_http.get_access_token") as mock:
        mock.return_value = test_access_token
        yield mock


@pytest.fixture
def mock_access_token_none():
    with patch("gfarm_http.get_access_token") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def mock_user_passwd():
    with patch("gfarm_http.get_user_passwd") as mock:
        mock.return_value = tuple(userpass_str.split(":", 1))
        yield mock


@pytest.fixture
def mock_size():
    with patch("gfarm_http.async_size") as mock:
        existing = True
        is_file = True
        size = 1
        mock.return_value = (existing, is_file, size)
        yield mock


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
    user = env.get("GFARM_SASL_USER")
    assert user == user_claim


def assert_is_basic_auth(kwargs):
    env = kwargs.get("env")
    mech = env.get("GFARM_SASL_MECHANISMS")
    assert mech == "PLAIN"
    user = env.get("GFARM_SASL_USER")
    assert user == "TESTUSER123"
    passwd = env.get("GFARM_SASL_PASSWORD")
    assert passwd == "PASSWO:RD123"


def assert_is_anon_auth(kwargs):
    env = kwargs.get("env")
    mech = env.get("GFARM_SASL_MECHANISMS")
    assert mech == "ANONYMOUS"


test_gfstat_str = """
File: "/tmp"
Size: 54321         Filetype: directory
Mode: (1777)        Uid: ( user1)  Gid: (gfarmadm)
Inode: 3            Gen: 5
                    (00000000000000030000000000000000)
Links: 2            Ncopy: 1
Access: 2025-02-10 18:27:33.191688265 +0000
Modify: 2025-02-10 18:27:31.071120060 +0000
Change: 2025-02-10 18:15:09.400000000 +0900
MetadataHost: gfmd1
MetadataPort: 601
MetadataUser: user1
"""
expect_stat = {
    "File": "/tmp",
    "Size": 54321,
    "Filetype": "directory",
    "Mode": "1777",
    "Uid": "user1",
    "Gid": "gfarmadm",
    "Inode": 3,
    "Gen": 5,
    "Links": 2,
    "Ncopy": 1,
    "Access": "2025-02-10 18:27:33.191688 +0000",
    "AccessSecound": 1739212053.191688,
    "Modify": "2025-02-10 18:27:31.071120 +0000",
    "ModifySecound": 1739212051.07112,
    "Change": "2025-02-10 18:15:09.400000 +0900",
    "ChangeSecound": 1739178909.4,
    "MetadataHost": "gfmd1",
    "MetadataPort": "601",
    "MetadataUser": "user1",
}

def test_parse_gfstat():
    st = gfarm_http.parse_gfstat(test_gfstat_str).model_dump()
    assert st == expect_stat


expect_gfwhoami_stdout = "testuser"
expect_gfwhoami = (expect_gfwhoami_stdout.encode(), b"error", 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami_oidc_auth(mock_claims, mock_exec):
    response = client.get("/conf/me", headers=req_headers_oidc_auth)
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfwhoami',)
    assert_is_oidc_auth(kwargs)
    assert response.text == expect_gfwhoami_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami_basic_auth(mock_claims, mock_exec):
    response = client.get("/conf/me", headers=req_headers_basic_auth)
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfwhoami',)
    assert_is_basic_auth(kwargs)
    assert response.text == expect_gfwhoami_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami_anon_auth_enabled(mock_anon, mock_claims, mock_exec):
    # GFARM_HTTP_ALLOW_ANONYMOUS=yes
    response = client.get("/conf/me", headers=req_headers_anon_auth)
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfwhoami',)
    assert_is_anon_auth(kwargs)
    assert response.text == expect_gfwhoami_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami_anon_auth_disabled(mock_claims, mock_exec):
    # GFARM_HTTP_ALLOW_ANONYMOUS=no (default)
    response = client.get("/conf/me", headers=req_headers_anon_auth)
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami_oidc_session(mock_claims, mock_access_token, mock_exec):
    response = client.get("/conf/me")
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfwhoami',)
    assert_is_oidc_auth(kwargs)
    assert response.text == expect_gfwhoami_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami_basic_session(mock_claims, mock_access_token_none,
                                    mock_user_passwd, mock_exec):
    response = client.get("/conf/me")
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfwhoami',)
    assert_is_basic_auth(kwargs)
    assert response.text == expect_gfwhoami_stdout


expect_gfls_stdout = "test gfls stdout"
expect_gfls = (expect_gfls_stdout.encode(), b"error", 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls)], indirect=True)
async def test_dir_list(mock_claims, mock_exec):
    response = client.get("/dir/testdir", headers=req_headers_oidc_auth)
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '/testdir')
    assert response.text == expect_gfls_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls)], indirect=True)
async def test_dir_list_a(mock_claims, mock_exec):
    response = client.get("/dir/testdir?a=1", headers=req_headers_oidc_auth)
    assert response.status_code == 200
    # NOT WORK: mock_exec.assert_called_with(args=['gfls', '-a', 'testdir'])
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '-a', '/testdir')
    assert response.text == expect_gfls_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls)], indirect=True)
async def test_dir_list_R(mock_claims, mock_exec):
    response = client.get("/dir/testdir?R=1", headers=req_headers_oidc_auth)
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '-R', '/testdir')
    assert response.text == expect_gfls_stdout


expect_gfls_err_msg = "test gfls (error)"
expect_gfls_err = (expect_gfls_err_msg.encode(), b"error", 1)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls_err)], indirect=True)
async def test_dir_list_err(mock_claims, mock_exec):
    response = client.get("/dir/testdir", headers=req_headers_oidc_auth)
    assert response.status_code == 500
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '/testdir')
    assert response.json() == {"detail": expect_gfls_err_msg}


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls_err)], indirect=True)
async def test_dir_list_ign_err(mock_claims, mock_exec):
    response = client.get("/dir/testdir?ign_err=1",
                          headers=req_headers_oidc_auth)
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '/testdir')
    assert response.text == expect_gfls_err_msg


no_stdout = ""
expect_no_stdout = (no_stdout.encode(), b"", 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_no_stdout)], indirect=True)
async def test_dir_create(mock_claims, mock_exec):
    response = client.put("/dir/a/testdir", headers=req_headers_oidc_auth)
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfmkdir', '/a/testdir')
    assert response.text == no_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_no_stdout)], indirect=True)
async def test_dir_remove(mock_claims, mock_exec):
    response = client.delete("/dir/testdir", headers=req_headers_oidc_auth)
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfrmdir', '/testdir')
    assert response.text == no_stdout


gfexport_stdout = b"test output data"
expect_gfexport = (gfexport_stdout, b"", 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfexport)], indirect=True)
async def test_file_export(mock_claims, mock_size, mock_exec):
    response = client.get("/file/a/testfile.txt",
                          headers=req_headers_oidc_auth)
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfexport', '/a/testfile.txt')
    assert response.content == gfexport_stdout


# TODO test_file_import
# TODO test_file_remove
# TODO test_move_rename
# TODO test_get_attr


expect_gfstat = (test_gfstat_str.encode(), b"", 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfstat)], indirect=True)
async def test_get_attr(mock_claims, mock_exec):
    response = client.get("/attr/dir/testfile.txt",
                          headers=req_headers_oidc_auth)
    assert response.status_code == 200
    args, kwargs = mock_exec.call_args
    assert args == ('gfstat', '-M', '/dir/testfile.txt')
    assert response.json() == expect_stat


# TODO test_change_attr


# MEMO: How to use arguments of patch() instead of pytest.mark.parametrize
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
