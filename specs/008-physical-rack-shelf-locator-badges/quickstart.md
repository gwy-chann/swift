# Quickstart & Verification Guide: Shelf Locator Mapping & Navigation Badges

**Feature**: `Physical Rack & Shelf Locator Mapping & Warehouse Navigation Badges`  
**Ticket**: `SIAA-14`  
**Reference Contracts**: [`contracts/shelf-locator-contracts.ts`](./contracts/shelf-locator-contracts.ts)  
**Data Model**: [`data-model.md`](./data-model.md)  

---

## 1. Prerequisites & Environment Setup

Ensure the SWIFT development environment dependencies are active:

```bash
# Verify node modules and development environment
npm run dev
```

---

## 2. Automated Test Verification (TDD First)

Run the Vitest test suites targeting shelf location parsing and catalog filter integration:

```bash
# Execute unit test suites for shelf location and catalog filtering
npx vitest run lib/inventory/__tests__/shelf-location.test.ts lib/inventory/__tests__/catalog-filter.test.ts
```

### Expected Test Outcomes
- `parseShelfLocation()` parses standard `"Rack A-01 / Shelf 2"`, single-token `"Floor"`, and whitespace/empty inputs correctly.
- Fallback returns `isAssigned: false` and `formatted: "Unassigned Bay"`.
- `filterCatalogProducts()` matches rack queries (e.g. `"Rack A-01"`, `"Shelf 2"`).
- Query `"unassigned"` filters all catalog items lacking physical storage bays.

---

## 3. UI Component Integration & Visual Scenarios

Verify the badge component in the Admin Inventory catalog (`http://localhost:3000/admin/inventory`):

### Scenario A: Standardized Assigned Bay Badge
1. Locate a part with an assigned bay (e.g. `Rack A-01 / Shelf 2`).
2. Verify it renders a distinct high-contrast badge containing:
   - CSS Class: `.shelf-location-tag`
   - Colors: `bg-secondary-light`, `text-secondary`, `border-secondary/20`
   - Icon: `MapPin`
   - Accessible label: `aria-label="Physical location: Rack A-01 / Shelf 2"`

### Scenario B: Unassigned Bay Warning Fallback
1. Locate or create a part with `location: ""` or undefined bay.
2. Verify it renders the warning badge:
   - Copy: `Unassigned Bay`
   - Colors: `bg-accent-light`, `text-accent`, `border-accent/30`
   - Icon: `AlertTriangle`
   - Accessible label: `aria-label="Warning: Storage bay unassigned"`

### Scenario C: Real-Time Location Search
1. In the search input on `/admin/inventory`, type `"Rack A-01"`.
2. Confirm only products in Rack A-01 are visible in under 50ms.
3. Type `"unassigned"`.
4. Confirm only items with missing bay assignments are displayed.

---

## 4. Theme & Accessibility Quality Gate

- Toggle Light/Dark mode via theme switcher: verify contrast ratio remains > 4.5:1.
- Run static analysis:
  ```bash
  npx tsc --noEmit
  npm run lint
  ```
