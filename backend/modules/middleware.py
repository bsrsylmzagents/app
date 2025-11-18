"""
Module access control middleware
"""
from fastapi import HTTPException, Depends
from typing import Dict, Any
import os
import logging

logger = logging.getLogger(__name__)

# Feature flag check
MODULES_ENABLED = os.environ.get("MODULES_ENABLED", "false").lower() == "true"

def check_module_access(module_name: str):
    """
    Dependency to check if user's company has access to a module
    Usage: @api_router.get("/hotels", dependencies=[Depends(check_module_access("hotel"))])
    """
    async def inner(current_user: dict = None):
        if not MODULES_ENABLED:
            # Feature flag disabled - allow all (backward compatibility)
            return current_user
        
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        company_id = current_user.get("company_id")
        if not company_id:
            raise HTTPException(status_code=403, detail="Company not found in token")
        
        # Admin (1000 code company) has access to all modules
        is_admin = current_user.get("is_admin", False)
        if is_admin:
            # Check if this is the system admin company (code 1000)
            import sys
            from pathlib import Path
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from server import db
            company = await db.companies.find_one({"id": company_id}, {"_id": 0, "company_code": 1})
            if company and company.get("company_code") == "1000":
                # System admin - allow all modules
                return current_user
        
        # Get company modules_enabled from DB
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from server import db
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        modules_enabled = company.get("modules_enabled", {})
        
        # Check if module is enabled
        if not modules_enabled.get(module_name, False):
            logger.warning(f"Module access denied: company_id={company_id}, module={module_name}")
            raise HTTPException(
                status_code=403,
                detail=f"Module '{module_name}' is not enabled for your company. Please contact admin."
            )
        
        return current_user
    
    return inner

def get_company_modules(company: Dict[str, Any]) -> Dict[str, bool]:
    """Get enabled modules for a company"""
    if not MODULES_ENABLED:
        return {"tour": True, "hotel": False}  # Default
    
    return company.get("modules_enabled", {"tour": True, "hotel": False})

