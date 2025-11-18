"""
Background scheduler for modular features
"""
import logging
import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

def start_scheduler():
    """Start background scheduler"""
    MODULES_ENABLED = os.environ.get("MODULES_ENABLED", "false").lower() == "true"
    if not MODULES_ENABLED:
        logger.info("Modules disabled - scheduler not started")
        return
    
    # Future module schedulers can be added here
    scheduler.start()
    logger.info("Background scheduler started")

def stop_scheduler():
    """Stop background scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler stopped")


