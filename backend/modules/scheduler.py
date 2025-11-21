"""
Background scheduler for modular features
"""
import logging
import os
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def cleanup_expired_companies(db):
    """
    Clean up data for companies that have been expired for more than 90 days.
    """
    try:
        today = datetime.now(timezone.utc).date()
        cutoff_date = today - timedelta(days=90)

        # Find expired companies
        cursor = db.companies.find({})
        async for company in cursor:
            package_end_date_str = company.get("package_end_date")
            if not package_end_date_str:
                continue

            try:
                package_end_date = datetime.strptime(package_end_date_str, "%Y-%m-%d").date()
                if package_end_date < cutoff_date:
                    company_id = company["id"]
                    company_name = company.get("company_name", "Unknown")
                    logger.info(f"Company {company_name} ({company_id}) expired on {package_end_date}. Cleaning up data...")

                    # Delete all associated data
                    collections_to_clean = [
                        "users", "reservations", "transactions", "cari_accounts", "caris",
                        "tour_types", "payment_types", "banks", "bank_accounts", "cash_accounts",
                        "payment_settlements", "notifications", "check_promissories", "extra_sales",
                        "service_purchases", "seasonal_prices", "salary_transactions", "overtimes",
                        "leaves", "vehicle_categories", "vehicles", "expense_categories",
                        "income_categories", "incomes", "expenses", "activity_logs",
                        "cash_exchanges", "cash_transfers", "staff_roles"
                    ]

                    for collection_name in collections_to_clean:
                        try:
                            result = await db[collection_name].delete_many({"company_id": company_id})
                            if result.deleted_count > 0:
                                logger.info(f"Deleted {result.deleted_count} records from {collection_name} for company {company_id}")
                        except Exception as e:
                            logger.error(f"Error cleaning collection {collection_name} for company {company_id}: {e}")

                    # Finally delete the company
                    await db.companies.delete_one({"id": company_id})
                    logger.info(f"Company {company_name} ({company_id}) deleted successfully.")

            except ValueError:
                logger.warning(f"Invalid package_end_date for company {company.get('id')}: {package_end_date_str}")
                continue

    except Exception as e:
        logger.error(f"Error in cleanup_expired_companies: {e}")

def start_scheduler(db=None):
    """Start background scheduler"""
    MODULES_ENABLED = os.environ.get("MODULES_ENABLED", "false").lower() == "true"
    if not MODULES_ENABLED:
        logger.info("Modules disabled - scheduler not started")
        return
    
    # Add scheduled jobs
    if db:
        # Run cleanup daily at 3 AM
        scheduler.add_job(cleanup_expired_companies, 'cron', hour=3, args=[db])
        logger.info("Scheduled cleanup_expired_companies job")

    scheduler.start()
    logger.info("Background scheduler started")

def stop_scheduler():
    """Stop background scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler stopped")
