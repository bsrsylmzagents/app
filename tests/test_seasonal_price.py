import pytest
from backend.server import SeasonalPrice
from datetime import datetime, timezone

def test_seasonal_price_model_has_price_per_atv():
    """Test that SeasonalPrice model has price_per_atv field and it's not ignored"""
    data = {
        "company_id": "test_company",
        "start_date": "2023-01-01",
        "end_date": "2023-12-31",
        "created_by": "test_user",
        "price_per_atv": 150.0,
        "currency": "EUR"
    }

    price = SeasonalPrice(**data)
    dumped = price.model_dump()

    assert "price_per_atv" in dumped
    assert dumped["price_per_atv"] == 150.0
    assert dumped["currency"] == "EUR"

def test_seasonal_price_model_ignores_extra_fields():
    """Test that other extra fields are still ignored"""
    data = {
        "company_id": "test_company",
        "start_date": "2023-01-01",
        "end_date": "2023-12-31",
        "created_by": "test_user",
        "price_per_atv": 150.0,
        "random_field": "should_be_ignored"
    }

    price = SeasonalPrice(**data)
    dumped = price.model_dump()

    assert "price_per_atv" in dumped
    assert "random_field" not in dumped
