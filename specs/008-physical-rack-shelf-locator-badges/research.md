# Research & Architectural Analysis: Shelf Locator Mapping

**Feature**: `Physical Rack & Shelf Locator Mapping & Warehouse Navigation Badges`  
**Ticket**: `SIAA-14`  
**Parent Epic**: `SIAA-2`  

---

## 1. Physical Location Representation & Delimiter Structure

- **Decision**: Store warehouse coordinates as a normalized string on `Product.location` using `<Zone/Rack> / <Shelf/Bin>` notation (e.g. `Rack A-01 / Shelf 2`), while tolerating single-token or non-standard entries via a pure parser utility (`parseShelfLocation`).
- **Rationale**: 
  - Standard warehouse layouts in motorcycle facilities separate aisle/rack shelving zones from vertical levels or bins.
  - A single string field maintains backward compatibility with mock data, seed scripts, and external CSV/ERP catalog imports without requiring breaking schema migrations across early development phases.
  - Human readability is immediate on shop floor displays, barcode price tags, and packing slips.
- **Alternatives Considered**:
  - *Normalized SQL Relation (`zones`, `racks`, `shelves` tables)*: Over-engineered for current single-facility inventory stage; introduces unnecessary join overhead during rapid table rendering and full-text searches.
  - *JSON/Tuple field `{ rack: string, shelf: string }`*: Inconvenient for legacy data imports and complicates direct text search in simple inputs without specialized serializers.

---

## 2. Empty Location Fallback & Warning Logic

- **Decision**: Any location value that is `null`, `undefined`, empty string (`""`), whitespace-only (`"   "`), or explicitly `"unassigned"` evaluates to an `isAssigned: false` state and renders an amber `Unassigned Bay` badge.
- **Rationale**:
  - Products without a designated storage bay create operational bottlenecks, as warehouse pickers cannot retrieve them in under 5 seconds.
  - An amber visual cue immediately alerts inventory managers to allocate bays during stock intake.
  - Zero chance of uncaught exceptions (`TypeError: Cannot read properties of undefined`) or blank gaps in the catalog grid.
- **Alternatives Considered**:
  - *Rendering a dash (`—`)*: Too discreet; fails to alert clerks that the item lacks physical routing coordinates.
  - *Throwing validation error on product load*: Breaks catalog display for unallocated items; unassigned items are a valid temporary state during new product onboarding.

---

## 3. High-Contrast Accessible Tag Design & Design Tokens

- **Decision**: 
  - Assigned locator badge: `bg-secondary-light`, `text-secondary`, `border-secondary/20` with Lucide `MapPin` icon.
  - Unassigned badge: `bg-accent-light`, `text-accent`, `border-accent/30` with Lucide `AlertTriangle` icon.
  - Include the `.shelf-location-tag` CSS selector class and descriptive `aria-label` attributes.
- **Rationale**:
  - Complies strictly with the non-negotiable SWIFT Design Tokens rule (zero hardcoded hex/RGB colors).
  - Guarantees seamless contrast (> 4.5:1 WCAG AA) in both Light Mode and Dark Mode automatically through CSS variable token inheritance.
  - Exposes `.shelf-location-tag` selector for automated test assertions and UI styling hooks.
- **Alternatives Considered**:
  - *Hardcoded CSS classes (`bg-blue-100 text-blue-800` / `bg-amber-100 text-amber-800`)*: Strictly forbidden by SWIFT Project Constitution Principle I.
  - *Neutral gray badge for both states*: Fails to distinguish between valid physical coordinates and unassigned warning states.

---

## 4. Search Filter & Location Query Matching

- **Decision**: 
  - Extend the search predicate in `filterCatalogProducts` to inspect `product.location` case-insensitively and trim query whitespace.
  - Map query `"unassigned"` to match any product where `!parseShelfLocation(product.location).isAssigned`.
- **Rationale**:
  - Floor mechanics often filter specifically by rack (e.g. typing `"Rack A-01"`) to batch-pick parts in a single physical aisle.
  - Inventory auditors need a single-keyword search (`"unassigned"`) to surface all items needing bay allocation without writing complex filters.
- **Alternatives Considered**:
  - *Adding a separate "Bay" dropdown filter*: Clutters the top filter bar; incorporating bay matching into the global search bar provides a more fluid, sub-50ms typing experience.
