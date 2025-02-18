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


@pytest.mark.asyncio
async def test_whoami(mock_claims):
    with patch('asyncio.create_subprocess_exec') \
         as mock_create_subprocess_exec:
        # Dummy asyncio.subprocess.Process
        mock_proc = Mock()
        mock_proc.stdout = asyncio.StreamReader()
        mock_proc.stdout.feed_data(b'testuser')
        mock_proc.stdout.feed_eof()
        mock_proc.stderr = asyncio.StreamReader()
        mock_proc.stderr.feed_eof()
        mock_future_wait = asyncio.Future()
        mock_proc.wait.return_value = mock_future_wait
        mock_future_wait.set_result(0)
        mock_create_subprocess_exec.return_value = mock_proc

        response = client.get("/c/me",
                              headers={"Authorization": "Bearer testtoken"}
                              )
        assert response.status_code == 200
        assert response.text == "testuser"
        # assert response.json() == {"name": "Test"}
