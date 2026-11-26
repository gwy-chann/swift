# Feature Specification: POS Engine: Real-Time Availability Validation & Sold-Out Rejection for Scanned SKUs

**Feature Branch**: `feat/SIAA-112-pos-realtime-availability-validation`  
**Created**: 2026-11-26  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-112](https://the-three-devsketeers.atlassian.net/browse/SIAA-112) (STORY-109.3)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109) (EPIC: Mobile Web Companion Barcode & SKU Scanner for POS Fast-Lane Checkout)  
**Target View**: Staff POS Terminal (`/staff/pos`) and Companion Scanner (`/staff/pos/scanner`)  

---

## 1. Executive Summary & Objective

In a fast-paced motorcycle parts retail counter, cashiers and warehouse staff quickly scan parts barcodes and service codes. Without strict, real-time availability validation at the scanning pipeline layer, items with zero or negative inventory can be inadvertently added to customer carts, leading to inventory shrinkage, awkward order cancellations at checkout, and stock discrepancies.

This feature implements the **Real-Time Availability Validation & Sold-Out Rejection Engine** within the SWIFT POS pipeline. It intercepts barcode scans, SKU lookups, and manual selections before cart ingestion, evaluating available catalog stock against current basket quantities. In-stock items are added with active retail/wholesale pricing and immediately reflected in cart totals; sold-out items are strictly rejected with clear visual warnings and error toasts; items exceeding remaining stock are capped; and unrecognized codes return explicit `NOT_FOUND` responses. Furthermore, every resolution broadcasts real-time validation telemetry (`PosScanValidationResponse`) back to paired mobile companion phone scanners via Supabase Realtime channels.

---

## 2. Clarifications & Architecture Invariants

### Clarifications Session
- **Q1: What happens if an item is out of stock (stock <= 0) and scanned?**  
  *Decision*: The POS system strictly rejects adding the item. Cart state remains unaltered. Desktop POS displays an error toast: `Cannot add [Item Name]: Item is out of stock.` An error response with `status: 'OUT_OF_STOCK'` is broadcast to the companion phone.
- **Q2: What happens if an item has remaining stock (e.g. 2 units), but the cart already contains 2 units and a 3rd scan is attempted?**  
  *Decision*: The cart store rejects the addition with `reason: 'exceeds_stock'`. Cart quantity remains unchanged at 2. Desktop POS displays a warning toast: `Cannot add another [Item Name]: Exceeds available stock (2 units max)`. An error response with `status: 'EXCEEDS_STOCK'` is broadcast to the companion phone.
- **Q3: What pricing tier applies when an item is successfully added?**  
  *Decision*: The active POS cart pricing tier determines the price (`wholesale` price if wholesale mode is active, otherwise standard `retail` price). The broadcast payload includes this active price.
- **Q4: How does the system handle unrecognized barcodes or non-catalog SKUs?**  
  *Decision*: `resolveBarcodeScanQuery` returns `status: 'NOT_FOUND'` with message: `Item code or barcode not found`. The desktop displays an error toast, and broadcasts `{ status: 'NOT_FOUND', query: rawCode, message: 'Barcode not found in catalog' }` without modifying the cart.
- **Q5: What payload format is broadcast to the mobile companion phone?**  
  *Decision*: A standardized `PosScanValidationResponse` containing:
  - `status`: `'SUCCESS' | 'OUT_OF_STOCK' | 'EXCEEDS_STOCK' | 'NOT_FOUND'`
  - `sku`, `name`, `price`, `stockRemaining`, `availableStock`, `currentCartQty`, `cartItemCount`, `cartTotal`, `message`, `timestamp`.

---

## 3. User Stories & Acceptance Criteria (Mike Cohn & Gherkin Format)

### User Story (Jira SIAA-112 / STORY-109.3)

* **As a** cashier and inventory administrator,
* **I want to** strictly validate item stock and availability immediately upon receiving a scanned barcode before adding it to the cart,
* **so that** in-stock items are added to the order while sold-out, unavailable, or over-quantity items are strictly rejected, preventing inventory shrinkage and invalid checkout orders.

---

### Scenario 1: Scanned item is in stock and available in sufficient quantity (Priority: P1)

* **Given** a scanned barcode or SKU resolves to an active inventory item with stock > 0 in the catalog
* **And** the current cart quantity for this item plus 1 does not exceed available `product.stock`
* **When** the scan resolution executes through `resolveBarcodeScanQuery()` and `useCartStore.addPart(product, 1)`
* **Then** the item is successfully added to the active cart (or existing item quantity incremented by 1) with appropriate retail/wholesale price tier applied
* **And** a success response is broadcast back to the companion phone containing:
  ```json
  {
    "status": "SUCCESS",
    "sku": "YAM-NMAX-BL01",
    "name": "Yamaha NMAX Brake Pad Set",
    "price": 480,
    "stockRemaining": 11,
    "cartItemCount": 1,
    "cartTotal": 480
  }
  ```

---

### Scenario 2: Scanned item is completely sold out (zero or negative stock) (Priority: P1)

* **Given** a scanned barcode matches an existing catalog item with `stock <= 0`
* **When** the scan validation pipeline checks stock availability
* **Then** the system strictly refuses to add the item to the cart (cart state remains completely unaltered)
* **And** the desktop POS displays an error toast: `"Cannot add [Item Name]: Item is out of stock."`
* **And** an error response is broadcast back to the phone:
  ```json
  {
    "status": "OUT_OF_STOCK",
    "sku": "HON-CLK-DRV01",
    "name": "Honda Click Drive Belt 125i",
    "requestedQty": 1,
    "availableStock": 0,
    "message": "Item is sold out"
  }
  ```

---

### Scenario 3: Scanned item quantity exceeds remaining inventory ceiling (Priority: P1)

* **Given** a product has `stock: 2`, and the active cart already contains `qty: 2` of this item
* **When** the staff member scans the same SKU barcode a third time
* **Then** the cart store rejects the addition (`addPart` returns `{ success: false, reason: 'exceeds_stock' }`) and cart quantity remains at 2
* **And** the desktop POS displays a warning toast: `"Cannot add another [Item Name]: Exceeds available stock (2 units max)"`
* **And** an error response is broadcast back to the phone:
  ```json
  {
    "status": "EXCEEDS_STOCK",
    "sku": "MOT-3100-10W40",
    "name": "Motul 3100 Silver 10W40 1L",
    "currentCartQty": 2,
    "availableStock": 2,
    "message": "Cannot add another Motul 3100 Silver 10W40 1L: Exceeds available stock (2 units max)"
  }
  ```

---

### Scenario 4: Unrecognized barcode or non-catalog SKU resolution (Priority: P1)

* **Given** a scanned barcode does not match any product SKU, manufacturer barcode, or labor service code
* **When** `resolveBarcodeScanQuery()` finishes evaluating the query against active inventory
* **Then** the system returns `status: 'NOT_FOUND'` with message: `"Item code or barcode not found"`
* **And** the desktop POS displays an error toast: `"Item code or barcode not found"`
* **And** broadcasts back to the phone without modifying the cart:
  ```json
  {
    "status": "NOT_FOUND",
    "query": "UNKNOWN-9999",
    "message": "Barcode not found in catalog"
  }
  ```

---

## 4. Non-Functional & System Invariants

1. **Deterministic Cart Integrity**: Cart quantity for any item can never exceed its `stock` value unless an authenticated manager override has been granted (`isOverridden: true`).
2. **Realtime Broadcast Resiliency**: Broadcast transmissions to companion phone channels must never throw uncaught exceptions or block POS UI execution if network drops or the Supabase Realtime channel is disconnected.
3. **SWIFT Design Tokens Compliance**: All toast messages, modal dialogs, and alert indicators must strictly adhere to SWIFT design tokens (`var(--danger)`, `var(--warning)`, `var(--success)`, `var(--text-primary)`, `var(--bg-surface)`). No hardcoded hex or arbitrary classes.
4. **WCAG 2.1 AA Accessibility**: All rejection toasts and status alerts must announce to assistive technology via `aria-live="polite"` or `role="alert"`.
