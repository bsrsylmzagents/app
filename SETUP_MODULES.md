# Modular SaaS Platform - Setup Guide

## Quick Start

### 1. Backend Setup

```bash
cd app/backend

# Install new dependencies
pip install stripe icalendar apscheduler

# Add to .env file:
MODULES_ENABLED=true
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
HOTEL_ICS_SYNC_ENABLED=true
HOTEL_ICS_SYNC_INTERVAL_SECONDS=60
HOTEL_PUSH_QUEUE_INTERVAL_SECONDS=300

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

## Testing

### 1. Test Module Purchase Flow

1. Login to admin panel
2. Navigate to `/store`
3. Click "Satın Al" on Hotel module
4. Complete Stripe checkout (use test card: 4242 4242 4242 4242)
5. After webhook processes, Hotel module should appear in sidebar

### 2. Test Hotel Module

1. Navigate to `/hotels` (requires hotel module enabled)
2. Create a hotel
3. Add rooms
4. Create reservation
5. Check push queue for status

### 3. Test ICS Sync

1. Configure hotel with ICS URL
2. Enable ICS sync
3. Wait for scheduler to run (or manually trigger via API)
4. Check `hotel_ics_events` collection

## API Endpoints

### Store
- `GET /api/store/modules` - List available modules
- `POST /api/store/create-checkout-session` - Create Stripe checkout
- `POST /api/store/webhook` - Stripe webhook handler

### Hotels
- `GET /api/hotels` - List hotels (requires hotel module)
- `POST /api/hotels` - Create hotel
- `GET /api/hotels/{id}` - Get hotel details
- `GET /api/hotels/{id}/reservations` - List reservations
- `POST /api/hotels/{id}/reservations` - Create reservation
- `POST /api/hotels/{id}/sync-ics` - Manual ICS sync
- `GET /api/hotels/push-queue` - View push queue
- `POST /api/hotels/push-queue/{id}/retry` - Retry failed push

## Sample Data

```bash
# Create sample hotels
python backend/modules/hotels/scripts/create_sample_hotels.py

# Create Stripe test customer
python backend/modules/billing/scripts/create_test_stripe_customer.py
```

## Monitoring

- Check scheduler logs for ICS sync and push queue jobs
- Monitor `hotel_reservation_push_queue` collection
- Check `billing_events` for payment webhooks

## Troubleshooting

1. **Modules not loading**: Check `MODULES_ENABLED=true` in .env
2. **Stripe webhook fails**: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
3. **ICS sync not working**: Check hotel `ics_url` and `ics_sync_enabled` flag
4. **Push queue stuck**: Check scheduler is running, verify push endpoint URLs



