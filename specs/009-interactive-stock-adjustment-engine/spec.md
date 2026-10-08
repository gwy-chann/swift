# Feature Specification: Interactive Stock Adjustment Engine with Reason-Based Audit Logging

- **Feature Key**: `SIAA-15`
- **Parent Epic**: `SIAA-2` (EPIC-2: Inventory & Warehouse Rack/Shelf Management)
- **Target Branch**: `feat/SIAA-15-stock-adjustment-engine`
- **Scope**: Components, Modal, Reactive State Mutations & Audit Logging

---

## 1. Executive Summary

Maintaining 100% inventory accuracy is paramount in motorcycle parts retail and repair operations. Unrecorded discrepancies cause lost sales, stalled workshop jobs, and unquantified shrinkage.

The Interactive Stock Adjustment Engine equips inventory clerks and store administrators with an intuitive, validated modal dialogue to execute inbound restocks, damaged goods write-offs, and physical audit corrections. Every adjustment strictly records an immutable audit record with standardized classification types, quantity deltas, timestamps, reason notes, and user attribution.

---

## 2. User Stories & Acceptance Criteria

### User Story (Mike Cohn Format)
**As an** Inventory Clerk or Store Administrator,  
**I want to** adjust stock quantities via an interactive modal requiring standardized adjustment types and audit notes,  
**so that** inventory counts remain 100% accurate with a transparent, immutable record of who modified stock and why.

### Acceptance Criteria (Gherkin Scenarios)

#### Scenario 1: Opening Stock Adjustment Modal
- **Given** an inventory clerk viewing the parts catalog table
- **When** they click the "Adjust" button on a specific part row (e.g. `YAM-NMAX-BL01`)
- **Then** the Stock Adjustment Modal opens displaying the part SKU, Name, and current on-hand stock quantity.

#### Scenario 2: Executing an Inbound Restock Adjustment
- **Given** the adjustment modal is open for a product
- **When** the clerk selects type "Restock" (or "Restock Inbound"), enters a quantity (e.g. 10), provides an optional reason note (e.g. "PO-4091 Supplier Delivery Received"), and submits
- **Then** the on-hand stock is incremented by 10
- **And** the catalog table reflects the updated quantity immediately without page reload.

#### Scenario 3: Executing a Damaged Goods Write-off or Audit Discrepancy
- **Given** the adjustment modal is open
- **When** the user selects "Damaged Goods" or "Audit Adjustment" with a quantity to deduct
- **Then** the on-hand stock is decremented accordingly (flooring at 0, preventing negative stock)
- **And** a negative quantity change entry is recorded.

#### Scenario 4: Immutable Audit Trail Generation
- **Given** a successful stock adjustment submission
- **When** the state mutation finishes
- **Then** a new record is prepended to `stockAdjustmentLogs` with a unique ID (`ADJ-XXXX`), current timestamp, SKU, adjustment type, quantity delta (e.g. `+10 Units` or `-2 Units`), reason note, and the authenticated user's display name.

---

## 3. UI/UX & Design Tokens Conformance

All elements adhere to the SWIFT Design System:
- **Modal Container**:
  - Backdrop: `bg-black/50 backdrop-blur-xs`
  - Dialog surface: `bg-bg-surface border border-border rounded-xl shadow-lg`
  - Header: Distinctive title with `SlidersHorizontal` icon
- **Controls & Input Fields**:
  - Select / Radio / Tabs: `bg-bg-input border border-border text-text-primary focus:border-primary`
  - Number input: Large font, validated non-negative numbers
  - Submit CTA: Primary button `bg-primary hover:bg-primary-hover text-text-light`
  - Cancel CTA: Secondary button `bg-bg-muted hover:bg-bg-hover text-text-secondary border border-border-subtle`
- **Zero Hardcoded Colors**: Strictly tokenized via `@/lib/tokens.ts` and Tailwind CSS v4 variables.
