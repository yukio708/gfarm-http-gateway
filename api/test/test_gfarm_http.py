import asyncio
import pytest
import pytest_asyncio
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient

from gfarm_api import app


client = TestClient(app)

req_headers_oidc = {"Authorization": "Bearer testtoken"}


@pytest.fixture
def mock_claims():
    with patch("jose.jwt.get_unverified_claims") as mock:
        mock.return_value = {
            "sub": "testuser",
        }
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


expect_gfwhoami = (b"testuser", b"error", 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfwhoami)], indirect=True)
async def test_whoami(mock_claims, mock_exec):
    response = client.get("/conf/me", headers=req_headers_oidc)
    assert response.status_code == 200
    assert response.text == "testuser"


expect_gfls_stdout = "test gfls stdout"
expect_gfls = (expect_gfls_stdout.encode(), b"error", 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls)], indirect=True)
async def test_list(mock_claims, mock_exec):
    response = client.get("/dir/testdir", headers=req_headers_oidc)
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '/testdir')
    assert response.status_code == 200
    assert response.text == expect_gfls_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls)], indirect=True)
async def test_list_a(mock_claims, mock_exec):
    response = client.get("/dir/testdir?a=1", headers=req_headers_oidc)
    # NOT WORK: mock_exec.assert_called_with(args=['gfls', '-a', 'testdir'])
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '-a', '/testdir')
    assert response.status_code == 200
    assert response.text == expect_gfls_stdout


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls)], indirect=True)
async def test_list_R(mock_claims, mock_exec):
    response = client.get("/dir/testdir?R=1", headers=req_headers_oidc)
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '-R', '/testdir')
    assert response.status_code == 200
    assert response.text == expect_gfls_stdout


expect_gfls_err_msg = "test gfls (error)"
expect_gfls_err = (expect_gfls_err_msg.encode(), b"error", 1)


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls_err)], indirect=True)
async def test_list_err(mock_claims, mock_exec):
    response = client.get("/dir/testdir", headers=req_headers_oidc)
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '/testdir')
    assert response.status_code == 500
    assert response.json() == {"detail": expect_gfls_err_msg}


@pytest.mark.asyncio
@pytest.mark.parametrize("mock_exec", [(expect_gfls_err)], indirect=True)
async def test_list_ign_err(mock_claims, mock_exec):
    response = client.get("/dir/testdir?ign_err=1", headers=req_headers_oidc)
    args, kwargs = mock_exec.call_args
    assert args == ('gfls', '-l', '/testdir')
    assert response.status_code == 200
    assert response.text == expect_gfls_err_msg
