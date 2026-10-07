# Technical Research: Domain Model & Reactive Store Architecture

**Feature**: `Centralized Domain Models & Reactive Mock Data Engine`
**Ticket**: `SIAA-12`
**Date**: 2026-10-07
**Updated**: 2026-10-08

## 1. Domain Entities Analysis from `mockup/app.js`

From `mockup/app.js`, the core data store (`SWIFT_DB`) and active state controllers define interconnected entities:

### A. Inventory & Products
Each product represents a motorcycle part with the canonical schema:
- `sku` (string): Unique stock keeping unit (e.g., `'YAM-NMAX-BL01'`, `'MOT-3100-10W40'`).
- `name` (string): Descriptive product name.
- `category` (string): `'Brakes'`, `'Drivetrain'`, `'Fluids'`, `'Ignition'`, `'Engine'`, `'Tires'`, etc.
- `stock` (number): Current shelf / warehouse on-hand quantity.
- `minThreshold` (number): Low-stock threshold warning level.
- `location` (string): Physical aisle, rack, and shelf coordinates (e.g., `'Rack A-01 / Shelf 2'`, `'Aisle 1 / Shelf 1'`, `'Tire Rack 1 / Floor'`).
- `cost` (number): Supplier base cost in PHP.
- `wholesale` (number): Wholesale discounted price for trade accounts in PHP.
- `retail` (number): Retail counter price in PHP.
- `oem` (boolean): `true` for Genuine OEM parts, `false` for aftermarket.
- `model` (string): Target motorcycle model fitment (e.g., `'Yamaha NMAX 155'`, `'Universal'`).
- `brand` (string): Manufacturer brand (e.g., `'Yamaha Genuine Parts'`, `'Racing Boy'`, `'Motul'`, `'Michelin'`).

### B. Flat-Rate Labor Services
- `code` (string): Unique service code (e.g., `'SRV-OIL-01'`).
- `name` (string): Service description (e.g., `'Standard Oil & Gear Oil Change'`).
- `bay` (string): Workshop bay assignment (e.g., `'Bay 1 / Quick Bay'`, `'Bay 2 / Scooter Bay'`).
- `rate` (number): Flat-rate labor cost in PHP.
- `duration` (string): Estimated completion duration (e.g., `'15 mins'`, `'45 mins'`).

### C. Motorcycle Models & Fitment
- Models: `'Yamaha NMAX 155'`, `'Yamaha Aerox 155'`, `'Honda Click 125i/150i'`, `'Honda ADV 160'`, `'Suzuki Raider 150 Fi'`.
- Fitment rule: Products match either their specific model name or `'Universal'`.

### D. POS Cart State & Hybrid Calculation Engine
The Fast-Lane POS cart manages hybrid orders containing both physical motorcycle parts and flat-rate labor line items:
- Item structure:
  - Part Item: `{ type: 'part', sku: string, name: string, price: number, qty: number, location?: string, retailPrice?: number, wholesalePrice?: number }`
  - Service Item: `{ type: 'service', code: string, name: string, price: number, qty: number, bay?: string }`
- Pricing Modes: `'retail'` vs `'wholesale'`. When pricing mode changes, part prices automatically switch to the product's corresponding retail or wholesale rate, while labor service flat rates remain unchanged.
- Discounts: `0` (None), `0.05` (5% Trade / Loyalty), `0.20` (20% Senior Citizen / PWD).
- Calculations:
  - Subtotal = $\sum (\text{item.price} \times \text{item.qty})$
  - Discount Amount = $\text{Subtotal} \times \text{discountRate}$
  - Grand Total = $\text{Subtotal} - \text{discountAmount}$

### E. Checkout & Transaction Entity
When checkout completes in `mockup/app.js`:
- Generates a thermal receipt record:
  - `id`: Unique receipt number, e.g. `'TX-1041'` or `TX-${Date.now().toString().slice(-4)}`
  - `timestamp`: Formatted checkout date/time string
  - `cashier`: Name of cashier, e.g. `'Mike Morales'`
  - `items`: Copy of active cart items
  - `pricingMode`: `'retail'` | `'wholesale'`
  - `subtotal`, `discountRate`, `discountAmount`, `total`
  - `cashTendered`: Cash received from customer
  - `change`: Cash change returned (`cashTendered - total`)
  - `paymentMethod`: `'Cash'` | `'GCash'` | `'Card'`
- Triggers inventory stock decrement for physical part line items.
- Clears the active cart.

### F. Shift Punch Clock Engine
- Tracks active shift duration (e.g. `shiftSeconds = 15150` ~ 04h 12m 30s).
- Live counter increments every second when active.
- Clock In / Out toggle transitions status between `'On Shift'` and `'Completed'`.
- Appends historical punch logs (`PunchLog`).

## 2. Reactive Store Architecture Decision

To provide high performance without heavy external state libraries (like Redux or Zustand):
- We implement a zero-dependency **Observable Store Pattern** using TypeScript and React's `useSyncExternalStore` hook.
- Each store (`cartStore`, `inventoryStore`, `punchStore`) maintains:
  - An internal state snapshot.
  - A Set of subscriber callbacks.
  - Pure mutation methods that update the snapshot and notify subscribers.
  - A custom React hook (`useCartStore`, `useInventoryStore`, `usePunchStore`) leveraging `useSyncExternalStore` for SSR safety and instant synchronization without unnecessary re-renders.
- All store operations execute synchronously in <1ms.
