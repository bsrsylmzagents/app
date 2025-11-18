# Modular SaaS Platform

This directory contains the modular SaaS system that extends the base application with pluggable modules.

## Architecture

- **modules/** - Core module system
  - **models.py** - Shared models (BillingEvent, ModuleFeatureFlag, etc.)
  - **middleware.py** - Module access control middleware
  - **scheduler.py** - Background job scheduler
  
- **modules/billing/** - Billing & Store module
  - **service.py** - Stripe integration
  - **routes.py** - Store API endpoints
  
- **modules/hotels/** - Hotel management module
  - **models.py** - Hotel, Room, Reservation, ICS models
  - **routes.py** - Hotel API endpoints
  - **push_adapter.py** - Push adapters (ICS, JSON, Email)
  - **ics_sync.py** - ICS calendar sync service
  - **push_queue.py** - Push retry queue processor

## Setup

1. **Environment Variables** (add to `.env`):
```bash
MODULES_ENABLED=true
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
HOTEL_ICS_SYNC_ENABLED=true
HOTEL_ICS_SYNC_INTERVAL_SECONDS=60
HOTEL_PUSH_QUEUE_INTERVAL_SECONDS=300
```

2. **Install Dependencies**:
```bash
pip install stripe icalendar apscheduler
```

3. **Run Migration**:
```bash
python backend/migrations/init_modules.py
```

4. **Start Server**:
```bash
uvicorn server:app --reload
```

## Features

### Module Access Control
- Companies have `modules_enabled` dict: `{"tour": true, "hotel": false}`
- Middleware `check_module_access("hotel")` protects routes
- Feature flag `MODULES_ENABLED` gates entire system

### Billing
- Stripe Checkout for module purchases
- Webhook handler for payment events
- Automatic module enablement on payment success

### Hotel Module
- ICS calendar sync (pull from external calendars)
- Push reservations to hotels (ICS, JSON, Email adapters)
- Retry queue for failed pushes
- Background scheduler for sync and queue processing

## API Endpoints

### Store
- `GET /api/store/modules` - List available modules
- `POST /api/store/create-checkout-session` - Create Stripe checkout
- `POST /api/store/webhook` - Stripe webhook handler

### Hotels
- `GET /api/hotels` - List hotels
- `POST /api/hotels` - Create hotel
- `GET /api/hotels/{id}/reservations` - List reservations
- `POST /api/hotels/{id}/reservations` - Create reservation (auto-push)
- `POST /api/hotels/{id}/sync-ics` - Manual ICS sync
- `GET /api/hotels/push-queue` - View push queue
- `POST /api/hotels/push-queue/{id}/retry` - Retry failed push

## Testing

See `backend/modules/tests/` for test suites.

## Monitoring

- Check scheduler logs for ICS sync and push queue jobs
- Monitor `hotel_reservation_push_queue` collection for failed items
- Check `billing_events` for payment webhook events


