# Research & Architecture Decisions: Side-by-Side OEM vs. Aftermarket Comparison Matrix

**Feature**: `025-oem-aftermarket-comparison-matrix`  
**Jira Ticket**: [SIAA-24](https://the-three-devsketeers.atlassian.net/browse/SIAA-24) (STORY-4.2)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Architectural Context & Technical Stack

- **Framework**: Next.js 15+ App Router, React 19, TypeScript 5.
- **Styling**: Tailwind CSS v4 using semantic design tokens defined in `app/globals.css`.
- **State Management**: Reactive cart additions via `cartStore` (`lib/store/cart-store.ts`), local UI feedback state (`addedSku`).
- **Data Flow**:
  - The comparison matrix accepts normalized comparison parts (`ComparisonPartItem` or `MotoMatcherMatrixPart` or `Product`).
  - Supports both direct client-side filtered inventory lists and server action payloads from `getMotoMatcherMatrixAction` (`lib/motomatcher/actions.ts`).
  - Segregates items into OEM (`oem: true` or `fitment_type === 'oem'`) and Aftermarket (`oem: false` or `fitment_type !== 'oem'`).

---

## 2. Component Design & Abstraction Boundary

### Existing State & Deficiencies:
1. `app/admin/motomatcher/admin-motomatcher-client.tsx` had an initial inline 2-column comparison layout with ad-hoc markup.
2. `app/staff/compat/page.tsx` rendered a single generic 2-column grid without side-by-side OEM vs. Aftermarket categorization.
3. Neither screen utilized a standardized, isolated component with comprehensive prop types and unit test coverage.

### Solution Architecture:
- Create `<ComparisonMatrix />` in `components/motomatcher/comparison-matrix.tsx`.
- The component is presentation-focused and highly composable:
  ```typescript
  export interface ComparisonMatrixProps {
    oemParts: ComparisonPartItem[];
    aftermarketParts: ComparisonPartItem[];
    onAddToCart?: (part: ComparisonPartItem) => void;
    addedSku?: string | null;
    isLoading?: boolean;
    emptyOemMessage?: string;
    emptyAftermarketMessage?: string;
  }
  ```
- Support both `Product` objects (with `retail`, `wholesale`, `location`, `oem`, `stock`) and `MotoMatcherMatrixPart` objects (from SIAA-54 RPC).
- Provide a normalization adapter function `normalizeToComparisonPart(item)` to ensure maximum compatibility.

---

## 3. Design Tokens & Visual Hierarchy

In accordance with the SWIFT Constitution and `.agents/rules/tailwind-v4.md`:

| UI Area | Token Classes | Visual Purpose |
| :--- | :--- | :--- |
| **OEM Header** | `bg-primary-light border-primary-border text-primary` | Calm, authoritative factory blue styling |
| **OEM Badge** | `bg-primary-light text-primary` | OEM factory badge |
| **Aftermarket Header** | `bg-secondary/10 border-secondary/20 text-secondary` | High-energy performance purple/amber styling |
| **Aftermarket Badge** | `bg-secondary/15 text-secondary` | Performance aftermarket badge |
| **Card Surface** | `bg-bg-surface border-border hover:border-primary` | Elevated, clean card container |
| **Shelf Location** | `text-text-secondary flex items-center gap-1` | Physical warehouse bin locator with `MapPin` icon |
| **Stock Badge (Normal)** | `bg-success-light text-success` | Healthy inventory status |
| **Stock Badge (Low)** | `bg-danger-light text-danger` | Alert for items at or below minimum threshold |
| **Upsell Delta Badge** | `bg-secondary/15 text-secondary font-bold text-[10px]` | Shows price differential (e.g. `+₱150.00 (+25.0%)`) |

---

## 4. Accessibility & Performance Considerations

- **Keyboard Navigation**: Interactive action buttons (`Add to POS Cart`) include proper focus rings, clear visual labels, and ARIA attributes.
- **Color Contrast**: All text and badge combinations adhere to WCAG 2.1 AA contrast standards.
- **Responsive Layout**: `grid grid-cols-1 lg:grid-cols-2 gap-4` ensures single-column stacking on mobile floor terminals while expanding to side-by-side comparison on desktop and tablet monitors.
- **Zero CLS (Cumulative Layout Shift)**: Empty states match card layout heights cleanly.
