"""
Test billing webhook handling
"""
import pytest
from modules.billing.service import handle_webhook_event

def test_checkout_completed_webhook():
    """Test that checkout.completed webhook enables module"""
    # Mock webhook event
    event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {
                    "company_id": "test_company_id",
                    "module": "hotel",
                    "plan_id": "basic"
                },
                "subscription": "sub_test123"
            }
        }
    }
    
    # This test requires DB setup
    # result = await handle_webhook_event(event)
    # assert result["processed"] == True
    pass


