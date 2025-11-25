"""
Standardized error handling utilities for TourCast.
"""
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class APIError(HTTPException):
    """Standardized API error with consistent structure"""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.metadata = metadata or {}


def handle_database_error(error: Exception, context: str = "") -> HTTPException:
    """
    Handle database-related errors consistently.
    
    Args:
        error: The exception that occurred
        context: Additional context about where the error occurred
        
    Returns:
        HTTPException with appropriate status code and message
    """
    logger.error(f"Database error {context}: {str(error)}")
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Database operation failed: {context or 'Unknown error'}"
    )


def handle_validation_error(error: Exception, field: Optional[str] = None) -> HTTPException:
    """
    Handle validation errors consistently.
    
    Args:
        error: The validation error
        field: The field that failed validation
        
    Returns:
        HTTPException with 400 status code
    """
    field_msg = f" for field '{field}'" if field else ""
    logger.warning(f"Validation error{field_msg}: {str(error)}")
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Validation failed{field_msg}: {str(error)}"
    )


def handle_not_found_error(resource: str, resource_id: Optional[str] = None) -> HTTPException:
    """
    Handle resource not found errors consistently.
    
    Args:
        resource: Type of resource (e.g., "Reservation", "User")
        resource_id: Optional ID of the resource
        
    Returns:
        HTTPException with 404 status code
    """
    id_msg = f" with ID '{resource_id}'" if resource_id else ""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} not found{id_msg}"
    )


def handle_unauthorized_error(reason: str = "Authentication required") -> HTTPException:
    """
    Handle unauthorized access errors consistently.
    
    Args:
        reason: Reason for unauthorized access
        
    Returns:
        HTTPException with 401 status code
    """
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=reason
    )


def handle_forbidden_error(reason: str = "Access forbidden") -> HTTPException:
    """
    Handle forbidden access errors consistently.
    
    Args:
        reason: Reason for forbidden access
        
    Returns:
        HTTPException with 403 status code
    """
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=reason
    )


