
import pytest
import asyncio
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from backend.server import get_server_public_ip, get_client_ip, create_activity_log, ActivityLog, SERVER_PUBLIC_IP

# Mocking db for create_activity_log
@pytest.fixture
def mock_db():
    with patch('backend.server.db') as mock:
        yield mock

@pytest.mark.asyncio
async def test_get_server_public_ip():
    # Mock successful response
    with patch('backend.server.requests.get') as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"ip": "1.2.3.4"}

        ip = await get_server_public_ip()
        assert ip == "1.2.3.4"

@pytest.mark.asyncio
async def test_get_server_public_ip_failure():
    # Mock failure
    with patch('backend.server.requests.get') as mock_get:
        mock_get.side_effect = Exception("Connection error")

        ip = await get_server_public_ip()
        assert ip == "unknown"

def test_get_client_ip():
    # Test Cloudflare header
    request = MagicMock()
    request.headers = {"CF-Connecting-IP": "5.6.7.8"}
    assert get_client_ip(request) == "5.6.7.8"

    # Test X-Forwarded-For
    request.headers = {"X-Forwarded-For": "9.10.11.12, 13.14.15.16"}
    assert get_client_ip(request) == "9.10.11.12"

    # Test Direct
    request.headers = {}
    request.client.host = "192.168.1.1"
    assert get_client_ip(request) == "192.168.1.1"

@pytest.mark.asyncio
async def test_create_activity_log_with_ip(mock_db):
    # Test with provided IP
    await create_activity_log(
        company_id="1",
        user_id="u1",
        username="test",
        full_name="Test User",
        action="test",
        entity_type="test",
        entity_id="1",
        ip_address="10.0.0.1"
    )

    mock_db.activity_logs.insert_one.assert_called_once()
    call_args = mock_db.activity_logs.insert_one.call_args[0][0]
    assert call_args["ip_address"] == "10.0.0.1"

@pytest.mark.asyncio
async def test_create_activity_log_fallback_ip(mock_db):
    # Update GLOBAL SERVER_PUBLIC_IP for test
    with patch('backend.server.SERVER_PUBLIC_IP', "8.8.8.8"):
        await create_activity_log(
            company_id="1",
            user_id="u1",
            username="test",
            full_name="Test User",
            action="test",
            entity_type="test",
            entity_id="1"
        )

        mock_db.activity_logs.insert_one.assert_called_once()
        call_args = mock_db.activity_logs.insert_one.call_args[0][0]
        assert call_args["ip_address"] == "8.8.8.8"
