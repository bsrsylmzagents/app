"""
Test ICS calendar sync
"""
import pytest
from modules.hotels.ics_sync import sync_hotel_ics

def test_ics_parse_and_upsert():
    """Test that ICS calendar is parsed and events are upserted"""
    # This test requires:
    # 1. Hotel with valid ICS URL
    # 2. Mock HTTP response with ICS content
    # 3. DB setup
    pass


