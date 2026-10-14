# Technical Research & Architectural Decisions: Staff Terminal Touch-Optimized MotoMatcher & Shelf Locator Integration

**Feature**: Staff Floor Terminal Touch-Optimized MotoMatcher & Shelf Locator Integration  
**Jira Issue**: [SIAA-27](https://the-three-devsketeers.atlassian.net/browse/SIAA-27)  
**Spec Reference**: [`specs/028-staff-terminal-motomatcher-shelf-locator/spec.md`](spec.md)  

---

## 1. Architectural Strategy & Design Considerations

The Staff Shop Floor Terminal (`/staff/compat`) serves floor mechanics, tire technicians, and service writers. Unlike backoffice desktop users with precision mouse pointers, shop floor staff interact through:
- 10" to 12" Android / iPad touch tablets carried directly to customer bikes in the repair bay.
- 15" to 22" all-in-one touch screens mounted near tool chests.
- Staff smartphones used for rapid shelf lookups in the warehouse aisles.

### Critical Needs Identified:
1. **Target Sizing**: Small buttons (< 32px) lead to missed taps, accidental activations, and operator frustration when wearing work gloves.
2. **Shelf Picking Speed**: Mechanics need to see physical warehouse bay coordinates (`Rack A-01 / Shelf 2`) directly in the comparison matrix card without opening detail modals.
3. **Viewport Adaptability**: On screen widths < 768px, a 2-column side-by-side matrix causes extreme horizontal compression or horizontal overflow. An active tabbed toggle between "OEM Standard" and "Aftermarket" allows mechanics to toggle between OEM and aftermarket options effortlessly with thumb taps.

---

## 2. Touch Target Optimization (WCAG 2.1 AA Compliance)

Per WCAG 2.1 Success Criterion 2.5.5 (Target Size - Level AAA) and standard mobile touch guidelines (Level AA / iOS HIG / Material Design):
- Minimum touch target dimension: **44px x 44px**.
- Add to Cart buttons in `<ComparisonMatrix />` are enhanced with:
  - Minimum height class `min-h-[44px]` (or `h-11`).
  - Generous horizontal padding `px-4`.
  - Prominent icon and high-contrast typography.
- Tab controls on mobile/tablet viewports have a minimum height of 44px and tap-friendly touch gutters.

---

## 3. Physical Shelf Locator Integration

The repository already defines a robust, tested shelf location badge:
[`components/inventory/shelf-location-tag.tsx`](file:///c:/Users/Roselle%20Tabuena/workspace/swift/swift/components/inventory/shelf-location-tag.tsx)
- Parsed via `parseShelfLocation(location)` (`lib/inventory/shelf-location.ts`).
- If assigned: renders `.shelf-location-tag` with `<MapPin />` icon and semantic `bg-secondary-light text-secondary border-secondary/20` tokens.
- If unassigned: renders amber warning badge with `<AlertTriangle />` and `bg-accent-light text-accent border-accent/30`.

### Integration Decision:
Instead of rendering a plain text `MapPin` snippet inside `renderPartCard`, `<ComparisonMatrix />` will render the standardized `<ShelfLocationTag location={part.shelfLocation} />` component.
This guarantees 100% visual and semantic parity between:
- Master Inventory Catalog (`/admin/inventory`)
- Staff Shelf Locator View (`/staff/search`)
- MotoMatcher Compatibility Cards (`/staff/compat` and `/admin/motomatcher`)

---

## 4. Responsive Dual-Column vs. Mobile Tabbed Toggle

### Desktop / Tablet Landscape (>= 768px):
- Both OEM Factory and Aftermarket Performance columns render side-by-side (`grid grid-cols-1 md:grid-cols-2 gap-4`).
- Mechanic can compare OEM specs vs aftermarket upgrade specs simultaneously.

### Mobile / Tablet Portrait (< 768px):
- A segmented pill switcher renders at the top of the comparison area:
  - `[ OEM Standard (N) ]` | `[ Performance / Aftermarket (M) ]`
- Only the selected column's cards render, expanding to 100% viewport width.
- Large, thumb-friendly segment buttons (`min-h-[44px]`).
- Smooth visual transition between tabs without page reload or layout shift.

---

## 5. Fast-Lane POS Hand-off

When "+ Add to Active POS Cart" is tapped:
- Dispatches item through `dispatchMotoMatcherCartInsertion({ part })`.
- Inserts into `usePosStore.getState().addItem(...)`.
- Triggers optimistic button confirmation (`Added to Cart` with `<Check />` icon for 1800ms).
- Renders an accessible floating toast notification (`role="status"`, `aria-live="polite"`).
- Multi-terminal cashiers connected via Supabase Realtime receive immediate cart line item updates.
