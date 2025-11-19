# Frontend Modular SaaS Modules

This directory contains frontend modules for the modular SaaS platform.

## Structure

- **store/** - Module store and purchase flow
  - `Store.jsx` - Main store page listing available modules
  - `StoreSuccess.jsx` - Success page after payment

- **admin/** - Admin module management
  - `ModuleSwitch.jsx` - Module switcher component for admin header

- **hotels/** - Hotel module UI
  - `Hotels.jsx` - Hotel list page
  - `HotelDetail.jsx` - Hotel detail page
  - `ModuleGuard.jsx` - Route guard to check module access

## Usage

### Module Guard

Wrap module-specific routes with `ModuleGuard`:

```jsx
<ModuleGuard moduleName="hotel">
  <YourComponent />
</ModuleGuard>
```

### Module Switch

Add to header:

```jsx
<ModuleSwitch onModuleChange={(module) => {
  // Handle module change
}} />
```

## Routes

- `/store` - Module store
- `/store/success` - Payment success page
- `/hotels` - Hotel list (requires hotel module)
- `/hotels/:id` - Hotel detail (requires hotel module)



