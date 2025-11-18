"""
Push adapter for hotel reservations - Strategy pattern
Supports ICS, JSON, and Email adapters
"""
import logging
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Tuple, Optional
from datetime import datetime
import os
from icalendar import Calendar, Event as ICalEvent

logger = logging.getLogger(__name__)

class PushAdapter:
    """Base push adapter interface"""
    
    def push_reservation(self, hotel: Dict[str, Any], reservation: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Push reservation to hotel
        Returns: (success, error_message, response_data)
        """
        raise NotImplementedError

class ICSAdapter(PushAdapter):
    """Push reservation as ICS/VEVENT via HTTP POST"""
    
    def push_reservation(self, hotel: Dict[str, Any], reservation: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        endpoint = hotel.get("push_endpoint")
        api_key = hotel.get("push_api_key")
        
        if not endpoint:
            return False, "Push endpoint not configured", None
        
        try:
            # Create ICS VEVENT
            cal = Calendar()
            event = ICalEvent()
            event.add('summary', f"Reservation: {reservation.get('customer_name', 'Guest')}")
            event.add('dtstart', datetime.fromisoformat(f"{reservation['checkin_date']}T14:00:00"))
            event.add('dtend', datetime.fromisoformat(f"{reservation['checkout_date']}T11:00:00"))
            event.add('uid', reservation.get('id', ''))
            event.add('description', f"Guest: {reservation.get('customer_name')}\nEmail: {reservation.get('customer_email', '')}\nPhone: {reservation.get('customer_phone', '')}")
            event.add('location', hotel.get('name', ''))
            cal.add_component(event)
            
            ics_content = cal.to_ical()
            
            # POST to endpoint
            headers = {"Content-Type": "text/calendar"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            
            response = requests.post(
                endpoint,
                data=ics_content,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                return True, None, {"status_code": response.status_code, "response": response.text[:500]}
            else:
                return False, f"HTTP {response.status_code}: {response.text[:200]}", {"status_code": response.status_code}
        
        except Exception as e:
            logger.error(f"ICS push error: {e}")
            return False, str(e), None

class JSONAdapter(PushAdapter):
    """Push reservation as JSON via REST API"""
    
    def push_reservation(self, hotel: Dict[str, Any], reservation: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        endpoint = hotel.get("push_endpoint")
        api_key = hotel.get("push_api_key")
        
        if not endpoint:
            return False, "Push endpoint not configured", None
        
        try:
            # Prepare JSON payload
            payload = {
                "reservation_id": reservation.get("id"),
                "customer_name": reservation.get("customer_name"),
                "customer_email": reservation.get("customer_email"),
                "customer_phone": reservation.get("customer_phone"),
                "checkin_date": reservation.get("checkin_date"),
                "checkout_date": reservation.get("checkout_date"),
                "guest_count": reservation.get("guest_count", 1),
                "room_id": reservation.get("room_id"),
                "total_price": reservation.get("total_price"),
                "currency": reservation.get("currency"),
                "status": reservation.get("status"),
                "notes": reservation.get("notes")
            }
            
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            
            response = requests.post(
                endpoint,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                return True, None, {"status_code": response.status_code, "response": response.json() if response.content else {}}
            else:
                return False, f"HTTP {response.status_code}: {response.text[:200]}", {"status_code": response.status_code}
        
        except Exception as e:
            logger.error(f"JSON push error: {e}")
            return False, str(e), None

class EmailAdapter(PushAdapter):
    """Push reservation via email (SMTP)"""
    
    def push_reservation(self, hotel: Dict[str, Any], reservation: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        email = hotel.get("push_email")
        smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user = os.environ.get("SMTP_USER")
        smtp_password = os.environ.get("SMTP_PASSWORD")
        from_email = os.environ.get("SMTP_FROM", smtp_user)
        
        if not email:
            return False, "Push email not configured", None
        
        if not smtp_user or not smtp_password:
            return False, "SMTP credentials not configured", None
        
        try:
            # Create email
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = email
            msg['Subject'] = f"New Reservation: {reservation.get('customer_name')}"
            
            body = f"""
New Reservation Details:

Guest: {reservation.get('customer_name')}
Email: {reservation.get('customer_email', 'N/A')}
Phone: {reservation.get('customer_phone', 'N/A')}
Check-in: {reservation.get('checkin_date')}
Check-out: {reservation.get('checkout_date')}
Guests: {reservation.get('guest_count', 1)}
Total: {reservation.get('total_price')} {reservation.get('currency')}
Notes: {reservation.get('notes', 'None')}

Reservation ID: {reservation.get('id')}
"""
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
            server.quit()
            
            return True, None, {"email": email, "sent_at": datetime.now().isoformat()}
        
        except Exception as e:
            logger.error(f"Email push error: {e}")
            return False, str(e), None

def get_push_adapter(method: str) -> PushAdapter:
    """Factory function to get appropriate push adapter"""
    adapters = {
        "ics": ICSAdapter(),
        "json": JSONAdapter(),
        "email": EmailAdapter()
    }
    return adapters.get(method.lower(), JSONAdapter())  # Default to JSON

def push_reservation(hotel: Dict[str, Any], reservation: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """Push reservation using configured adapter"""
    method = hotel.get("push_method", "json")
    adapter = get_push_adapter(method)
    return adapter.push_reservation(hotel, reservation)

