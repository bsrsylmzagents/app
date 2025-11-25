import pytest
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime, timedelta, timezone
from backend.server import get_admin_customers, generate_company_code, db

@pytest.mark.asyncio
async def test_generate_company_code_sequential():
    # Mock db.companies.find to return a list of companies with company codes
    # Use a MagicMock that returns an async iterator for the cursor
    mock_cursor = MagicMock()
    # AsyncMock for to_list
    mock_cursor.to_list = AsyncMock(return_value=[
        {"company_code": "1000"},
        {"company_code": "1001"},
        {"company_code": "legacy_code"}
    ])

    # Mock db.companies.find to return the cursor
    db.companies.find = MagicMock(return_value=mock_cursor)

    code = await generate_company_code(db)
    assert code == "1002"

@pytest.mark.asyncio
async def test_generate_company_code_first():
    # Mock db.companies.find to return empty list (or no numeric codes)
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    db.companies.find = MagicMock(return_value=mock_cursor)

    code = await generate_company_code(db)
    assert code == "1000"

@pytest.mark.asyncio
async def test_get_admin_customers_remaining_days_and_status():
    today = datetime.now(timezone.utc).date()

    # Create mock companies
    companies = [
        {
            "id": "c1",
            "company_name": "Active Company",
            "package_end_date": (today + timedelta(days=100)).strftime("%Y-%m-%d")
        },
        {
            "id": "c2",
            "company_name": "Expiring 3 Months",
            "package_end_date": (today + timedelta(days=60)).strftime("%Y-%m-%d")
        },
        {
            "id": "c3",
            "company_name": "Expiring 1 Month",
            "package_end_date": (today + timedelta(days=10)).strftime("%Y-%m-%d")
        },
        {
            "id": "c4",
            "company_name": "Expired",
            "package_end_date": (today - timedelta(days=1)).strftime("%Y-%m-%d")
        },
        {
            "id": "c5",
            "company_name": "No Date",
            "package_end_date": None
        }
    ]

    # Mock db calls
    # get_admin_customers calls db.companies.find
    mock_companies_cursor = MagicMock()
    mock_companies_cursor.sort = MagicMock(return_value=mock_companies_cursor)
    mock_companies_cursor.to_list = AsyncMock(return_value=companies)
    db.companies.find = MagicMock(return_value=mock_companies_cursor)

    # It also calls db.users.find_one for owner, mock that
    db.users.find_one = AsyncMock(return_value={"username": "admin"})

    # Mock get_admin_user dependency (just return current user)
    mock_current_user = {"user_id": "u1", "company_id": "comp_admin", "is_admin": True}

    # Test without filter
    results = await get_admin_customers(status_filter=None, current_user=mock_current_user)

    assert len(results) == 5

    c1 = next(r for r in results if r["id"] == "c1")
    assert c1["status"] == "active"
    assert c1["remaining_days"] > 90

    c2 = next(r for r in results if r["id"] == "c2")
    assert c2["status"] == "expiring_3_months"
    assert 30 < c2["remaining_days"] <= 90

    c3 = next(r for r in results if r["id"] == "c3")
    assert c3["status"] == "expiring_1_month"
    assert 0 <= c3["remaining_days"] <= 30

    c4 = next(r for r in results if r["id"] == "c4")
    assert c4["status"] == "expired"
    assert c4["remaining_days"] < 0

    # Test filtering

    # Filter Active
    results_active = await get_admin_customers(status_filter="active", current_user=mock_current_user)
    # Re-mock the cursor because it might be consumed or need reset logic in real implementation,
    # but here we mock the function call again to be safe if logic changed,
    # though in this test setup `db.companies.find` returns a new cursor mock every time if we didn't reuse the variable.
    # Since we reused `mock_companies_cursor`, `to_list` is async and mocked.
    # The function `get_admin_customers` iterates over the result of `to_list`.
    # The filter happens in python code, so we can check the result.

    # Wait, my mock setup returns the same list every time `to_list` is called.
    # `get_admin_customers` logic filters the list after fetching.

    assert len(results_active) == 2 # Active and No Date (if logic handles None as active? code says status="active" for None?)
    # Looking at code:
    # if package_end_date_str: ...
    # else: remaining_days=0, status="active" -> Wait, line 10242 `status = "active"` initially.
    # So 'No Date' is active.

    # Filter Expiring 1 Month
    results_1m = await get_admin_customers(status_filter="expiring_1_month", current_user=mock_current_user)
    assert len(results_1m) == 1
    assert results_1m[0]["id"] == "c3"

    # Filter Expired
    results_expired = await get_admin_customers(status_filter="expired", current_user=mock_current_user)
    assert len(results_expired) == 1
    assert results_expired[0]["id"] == "c4"
