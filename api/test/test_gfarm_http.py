import asyncio
import pytest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient

from gfarm_api import app


client = TestClient(app)


@pytest.fixture
def mock_claims():
    with patch("jose.jwt.get_unverified_claims") as mock:
        mock.return_value = {
            "sub": "testuser",
        }
        yield mock


class patch_exec(object):
    def __init__(self, stdout=None, stderr=None):
        self.stdout = stdout
        self.stderr = stderr
        self.patch = patch('asyncio.create_subprocess_exec')

    def __enter__(self):
        mock = self.patch.__enter__()

        # Dummy asyncio.subprocess.Process
        mock_proc = Mock()
        mock_proc.stdout = asyncio.StreamReader()
        if self.stdout is not None:
            mock_proc.stdout.feed_data(self.stdout)
        mock_proc.stdout.feed_eof()
        mock_proc.stderr = asyncio.StreamReader()
        if self.stderr is not None:
            mock_proc.stderr.feed_data(self.stderr)
        mock_proc.stderr.feed_eof()
        mock_future_wait = asyncio.Future()
        mock_proc.wait.return_value = mock_future_wait
        mock_future_wait.set_result(0)
        mock.return_value = mock_proc
        return mock

    def __exit__(self, *exc_info):
        return self.patch.__exit__(*exc_info)


@pytest.mark.asyncio
async def test_whoami(mock_claims):
    with patch_exec(stdout=b'testuser'):
        response = client.get("/conf/me",
                              headers={"Authorization": "Bearer testtoken"}
                              )
        assert response.status_code == 200
        assert response.text == "testuser"
        # assert response.json() == {"name": "Test"}


# See: https://docs.pytest.org/en/latest/example/parametrize.html#apply-indirect-on-particular-arguments  # noqa: E501
@pytest.fixture(scope="function")
def mock_exec(request):
    stdout, stderr = request.param
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
        mock_future_wait.set_result(0)
        mock.return_value = mock_proc
        yield mock


@pytest.mark.asyncio
# @pytest.mark.parametrize("mock_exec",
#                          [((b"testuser", b"error"))], indirect=["mock_exec"])
@pytest.mark.parametrize("mock_exec",
                         [((b"testuser", b"error"))], indirect=True)
async def test_whoami2(mock_claims, mock_exec):
    response = client.get("/conf/me",
                          headers={"Authorization": "Bearer testtoken"}
                          )
    assert response.status_code == 200
    assert response.text == "testuser"
