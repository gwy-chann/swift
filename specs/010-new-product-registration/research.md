# Research & Architectural Analysis: New Product Registration with Automated Markup & Location Assignment

**Feature**: `SIAA-16` (STORY-2.4: New Product Registration with Automated Markup & Location Assignment)  
**Parent Epic**: `SIAA-2` (EPIC-2: Inventory & Warehouse Rack/Shelf Management)  
**Branch**: `feat/SIAA-16-new-product-registration`

---

## 1. Markup Engine Architecture & Real-Time Calculation Flow

### Decision
Implement pure calculation functions (`calculateMarkupPrices`, `validateProductRegistration`, `normalizeSku`) in `lib/inventory/product-registration.ts`. The calculation dynamically computes Wholesale and Retail prices based on standard store markup rules:
- **Wholesale Price**: $\text{Cost} \times (1 + \frac{\text{wholesaleMarkup}}{100})$, default $+18\%$.
- **Retail Price (OEM)**: $\text{Cost} \times (1 + \frac{\text{retailMarkup}}{100})$, default $+35\%$.
- **Retail Price (Aftermarket)**: $\text{Cost} \times (1 + \frac{\text{aftermarketMarkup}}{100})$, default $+40\%$.
Both outputs are rounded to two decimal places (`Math.round(val * 100) / 100`).

### Rationale
- Decoupling price derivation from React components ensures high testability via standard unit tests and allows reuse in CLI tools, bulk CSV imports, and backend server actions.
- Automatically distinguishing between OEM standard replacement (+35%) and performance aftermarket (+40%) protects gross margins without requiring staff to perform manual math.
- Maintaining manual override capability provides necessary commercial agility for clearance items, price-matched parts, or promotional bundles.

### Alternatives Considered
- *Hardcoded markup constants directly in UI component state*: Rejected because markup rules are configurable at the store level (EPIC-7 / `PricingRules`) and hardcoding would violate DRY and Constitution Principle II.
- *Server-only calculation via API request on keystroke*: Rejected because local client-side calculation executes in `< 1ms`, eliminating network latency and providing instantaneous user feedback as the user types.

---

## 2. SKU Collision Prevention & Normalization

### Decision
Normalize all SKU entries prior to validation and storage by trimming whitespace and converting to uppercase (`sku.trim().toUpperCase()`). Perform case-insensitive uniqueness checks against the active catalog:
$$\exists p \in \text{catalog} : p.\text{sku}.\text{toUpperCase}() = \text{newSku}.\text{toUpperCase}()$$
Block submission and display an immediate visual collision alert if a duplicate is detected.

### Rationale
- SKUs are primary operational keys used across inventory, barcode labels, and POS lookup. Casing discrepancies (e.g., `yam-nmax-bl01` vs `YAM-NMAX-BL01`) must never create duplicate records.
- Instant validation prevents downstream data corruption and foreign key collisions in PostgreSQL / Supabase tables.

### Alternatives Considered
- *Allowing duplicates with auto-incremented suffixes (e.g., `SKU-1`)*: Rejected because inventory management requires distinct physical parts to have distinct, operator-assigned item codes.
- *Validating only on server action submission*: Rejected because client-side pre-validation provides immediate feedback before the user completes the remaining form fields.

---

## 3. Product Registration Modal UX & Accessibility

### Decision
Create `<ProductRegistrationModal>` in `components/admin/inventory/product-registration-modal.tsx` adhering to WAI-ARIA standards and SWIFT Constitution Principle V:
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="register-product-modal-title"`.
- Keyboard trap with `Escape` key dismissal and backdrop click handler.
- Clear two-column responsive form layout with logical tab ordering.
- Visual indicator distinguishing between OEM and Aftermarket specifications.
- Clear error alerts for SKU collision, non-positive unit cost, or missing required fields.

### Rationale
- Follows the exact layout, fields, and interaction states established in `mockup/admin.html` (lines 625–720).
- Fits within the established desktop/tablet modal sizing (~580px–640px) with responsive padding on mobile screens.

### Alternatives Considered
- *Navigating to a separate page `/admin/inventory/new`*: Rejected because modal dialog allows fast, contextual intake without losing search filters or catalog position on `/admin/inventory`.

---

## 4. Dual Audit Trail Recording & Reactive Store Mutation

### Decision
Integrate registration into `InventoryStore` (`lib/store/inventory-store.ts`) via `registerProduct(product, options)`:
1. Prepend the new product to `state.products` (`[newProduct, ...state.products]`).
2. If `initialStock > 0`, prepend an initial inbound movement record to `state.adjustmentLogs`:
   - `id`: `ADJ-XXXX`
   - `type`: `'Restock Inbound'`
   - `change`: `+${initialStock} Unit(s)`
   - `reason`: `'New product master registration'`
   - `user`: performing user or `'Inventory Supervisor (Admin)'`
3. Generate a system audit entry recording part creation.
4. Notify reactive store subscribers to trigger seamless UI re-renders across catalog views and KPI cards in `< 50ms`.

### Rationale
- Conforms directly to Acceptance Criteria Scenario 4 and `mockup/app.js` (lines 553–572).
- Ensures initial inventory is accounted for in cycle count history and anti-theft audit ledgers.

### Alternatives Considered
- *Treating registration and initial stock as separate manual steps*: Rejected because forcing staff to register a part and then immediately open a second modal to adjust stock increases intake time by 100%.

---

## 5. Design Tokens & Styling Architecture (Tailwind CSS v4)

### Decision
Strictly utilize SWIFT semantic design tokens:
- Modal surface: `bg-bg-surface border border-border rounded-xl shadow-lg`
- Backdrop overlay: `bg-black/50 backdrop-blur-xs`
- Form controls: `bg-bg-input border border-border text-text-primary focus:border-primary`
- Field labels: `text-text-secondary text-sm font-medium`
- Primary CTA: `bg-primary hover:bg-primary-hover text-text-light`
- Cancel CTA: `bg-bg-muted hover:bg-bg-hover text-text-secondary border border-border-subtle`
- Alert badges: `text-danger bg-danger-light border-danger/30`

### Rationale
- Enforces 100% adherence to SWIFT Project Constitution Principle I (Zero Hardcoded Colors).
- Ensures seamless Light and Dark mode contrast without manual utility duplication.
