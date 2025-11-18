"""
Test module access control
"""
import pytest
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_module_access_without_module():
    """Test that accessing hotel endpoint without module returns 403"""
    # This test requires authentication setup
    # For now, just a placeholder
    pass

def test_module_access_with_module():
    """Test that accessing hotel endpoint with module enabled works"""
    # This test requires authentication and module setup
    # For now, just a placeholder
    pass


