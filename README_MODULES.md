# Modular SaaS Platform - Implementation Guide

This document describes the modular SaaS platform implementation that extends the existing FastAPI + MongoDB backend and React frontend.

## Overview

The system supports pluggable modules (initially "tour" and "hotel") with:
- Module purchase via Stripe
- Admin module access control
- Hotel module with two-way ICS sync
- Push adapters for hotel reservations
- Background job scheduling

## Quick Start

### 1. Backend Setup

```bash
cd app/backend

# Install dependencies
pip install -r requirements.txt

# Add to .env:
MODULES_ENABLED=true
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
HOTEL_ICS_SYNC_ENABLED=true
HOTEL_ICS_SYNC_INTERVAL_SECONDS=60

# Run migration
python migrations/init_modules.py

# Start server
uvicorn server:app --reload
```

### 2. Frontend Setup

```bash
cd app/frontend
npm install
npm start
```

## Architecture

### Backend Structure

```
backend/
├── modules/
│   ├── __init__.py
│   ├── models.py          # Shared models
│   ├── middleware.py      # Module access control
│   ├── scheduler.py       # Background jobs
│   ├── billing/
│   │   ├── service.py     # Stripe integration
│   │   └── routes.py      # Store API
│   └── hotels/
│       ├── models.py       # Hotel models
│       ├── routes.py       # Hotel API
│       ├── push_adapter.py # Push strategies
│       ├── ics_sync.py     # ICS sync service
│       └── push_queue.py   # Retry queue
└── migrations/
    └── init_modules.py    # DB migration
```

### Database Collections

**New Collections:**
- `billing_events` - Payment webhook events
- `module_feature_flags` - Global feature toggles
- `hotels` - Hotel entities
- `hotel_rooms` - Room types
- `hotel_prices` - Dynamic pricing
- `hotel_reservations` - Reservations
- `hotel_ics_events` - Synced ICS events
- `hotel_reservation_push_queue` - Failed push retry queue
- `hotel_reservation_push_logs` - Push attempt logs

**Updated Collections:**
- `companies` - Added `modules_enabled` and `billing` fields

## Features

### 1. Module Access Control

- Companies have `modules_enabled: {"tour": true, "hotel": false}`
- Middleware `check_module_access("hotel")` protects routes
- Feature flag `MODULES_ENABLED` gates entire system

### 2. Billing & Store

- Stripe Checkout integration
- Webhook handler for payment events
- Automatic module enablement on success
- Subscription management

### 3. Hotel Module

- **ICS Sync**: Pulls external calendars every minute
- **Push Adapters**: ICS, JSON, Email strategies
- **Retry Queue**: Exponential backoff for failed pushes
- **Background Jobs**: APScheduler for sync and queue

## API Endpoints

### Store
- `GET /api/store/modules` - List modules and plans
- `POST /api/store/create-checkout-session` - Create Stripe checkout
- `POST /api/store/webhook` - Stripe webhook handler

### Hotels
- `GET /api/hotels` - List hotels (requires hotel module)
- `POST /api/hotels` - Create hotel
- `GET /api/hotels/{id}/reservations` - List reservations
- `POST /api/hotels/{id}/reservations` - Create reservation (auto-push)
- `POST /api/hotels/{id}/sync-ics` - Manual ICS sync
- `GET /api/hotels/push-queue` - View push queue
- `POST /api/hotels/push-queue/{id}/retry` - Retry push

## Testing

### Backend Tests
```bash
pytest backend/modules/tests/
```

### Manual Testing
1. Create company with hotel module disabled
2. Try to access `/api/hotels` → Should get 403
3. Purchase hotel module via store
4. Access `/api/hotels` → Should work
5. Create hotel reservation → Should push to endpoint
6. Check push queue for failed items

## Deployment

1. Set `MODULES_ENABLED=true` in production `.env`
2. Configure Stripe production keys
3. Run migration: `python migrations/init_modules.py`
4. Start server with scheduler enabled
5. Monitor push queue and ICS sync jobs

## Monitoring

- **Push Queue**: Check `hotel_reservation_push_queue` for failed items
- **ICS Sync**: Check `hotel_ics_events` for synced events
- **Billing**: Check `billing_events` for webhook events
- **Scheduler**: Check logs for job execution

## Security

- Webhook signature validation
- Module access middleware
- API key authentication for push endpoints
- Rate limiting on billing endpoints

## Next Steps

1. Implement frontend Store page
2. Add admin module switch UI
3. Create hotel module frontend pages
4. Add comprehensive tests
5. Set up monitoring and alerts



