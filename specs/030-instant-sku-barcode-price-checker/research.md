# Technical Research & Architectural Decisions: Instant SKU / Barcode Price Checker & Margin Simulator

**Feature**: Instant SKU / Barcode Price Checker & Margin Simulator  
**Jira Issue**: [SIAA-31](https://the-three-devsketeers.atlassian.net/browse/SIAA-31) (STORY-5.4)  
**Spec Reference**: [`specs/030-instant-sku-barcode-price-checker/spec.md`](spec.md)  

---

## 1. Architectural Strategy & Design Considerations

The Staff Shop Floor Terminal (`/staff/pricecheck`) enables floor mechanics and parts counter staff to answer price queries in seconds. In typical motorcycle parts shops, customers often ask:
- *"How much is this front brake pad?"*
- *"Can I get wholesale price if I buy 5 pairs or if I'm a partner shop?"*
- *"Where is this part located in the warehouse?"*
- *"What's our profit margin if we give a special deal?"*

### Core Architectural Decisions:
1. **Sub-200ms Search Optimization**:
   - Hardware USB/Bluetooth handheld barcode scanners send character sequences terminated by an `Enter` keypress (`\r` / `\n`).
   - We implement both **instant Enter-triggered lookup** (0ms delay) and **debounced text input** (100ms delay) using React 19's `useTransition` to prevent blocking the UI thread.
   - Server Action `lookupProductPriceAction` searches by exact SKU, barcode, and partial product name, with offline mock fallback guaranteeing instantaneous resolution even during intermittent network drops.
2. **Gross Markup vs. Margin Mathematical Formulas**:
   - **Gross Markup % (Cost-based)**: `((Retail - Cost) / Cost) * 100` (e.g. Cost ₱280, Retail ₱450 -> `((450 - 280) / 280) * 100 = 60.7%`).
   - **Wholesale Markup %**: `((Wholesale - Cost) / Cost) * 100` (e.g. Cost ₱280, Wholesale ₱380 -> `35.7%`).
   - **Gross Margin % (Revenue-based)**: `((Retail - Cost) / Retail) * 100` (e.g. `((450 - 280) / 450) * 100 = 37.8%`).
   - **Gross Profit (₱)**: `Retail - Cost`.
   - **SC/PWD Statutory 20% Discount**: `Retail * 0.80`.
3. **Physical Shelf Locator Parity**:
   - Standardized on `components/inventory/shelf-location-tag.tsx`, displaying `<ShelfLocationTag location={product.location} />`.
   - Coordinates such as `Rack A-01 / Shelf 2` are formatted consistently across all staff and admin modules.
4. **Mockup Parity**:
   - Matches `#view-staff-pricecheck`, `#priceScanInput`, and `#priceScanResultBox` as defined in `mockup/staff.html` lines 224-270 and `mockup/app.js` lines 774-830.
   - Includes the "Base Product Price Schedule (Wholesale vs Retail)" data table for quick visual reference of top high-velocity parts.

---

## 2. Server Action & Domain Contract Updates

The existing server action `lookupProductPriceAction` in `lib/staff/actions.ts` already queries Supabase and `MOCK_PRODUCTS`. However, it currently omits:
- `cost: number`
- `grossMarkupPercent: number`
- `wholesaleMarkupPercent: number`
- `barcode?: string`

### Contract Enhancements (`lib/staff/types.ts` & `contracts/pricecheck.ts`):
```typescript
export interface ProductPriceCheckItem {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  stock: number;
  minThreshold: number;
  location: string;
  cost: number;
  retailPrice: number;
  wholesalePrice: number;
  scPwdPrice: number;
  grossMarkupPercent: number;
  wholesaleMarkupPercent: number;
}
```

---

## 3. Margin Simulator Interactive Engine

Staff frequently need to test price points (e.g. for fleet accounts, loyalty mechanics, or bulk deals). The view will include an interactive **Margin Simulator** module:
- Takes current matched item's `cost` and `retailPrice` as defaults.
- Allows staff to adjust simulated retail price or wholesale price.
- Live calculation output:
  - Simulated Gross Profit (₱)
  - Simulated Markup %
  - Simulated Margin %
  - Visual status badge: Green (`Profitable`), Amber (`Low Margin < 15%`), or Red (`Below Cost / Negative Margin`).

---

## 4. Theme Tokens & Zero Hardcoded Colors Compliance

In compliance with SWIFT Constitution Principle I:
- Backgrounds: `bg-bg-base`, `bg-bg-surface`, `bg-bg-card`
- Borders: `border-border`, `border-border-subtle`
- Wholesale Accents: `text-warning`, `bg-warning-light`, `border-warning/30`
- Retail Accents: `text-success`, `bg-success-light`, `border-success/30`
- Base Cost / Standard Accents: `text-text-primary`, `text-text-muted`
- Danger / Empty States: `text-danger`, `bg-danger-light`, `border-danger/30`
- Zero hardcoded hex (`#...`) or rgb values.
