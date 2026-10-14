# Quickstart & Verification Guide: Staff Terminal Touch-Optimized MotoMatcher & Shelf Locator Integration

**Feature**: `028-staff-terminal-motomatcher-shelf-locator`  
**Jira Ticket**: [SIAA-27](https://the-three-devsketeers.atlassian.net/browse/SIAA-27) (STORY-4.5)  

---

## 1. Automated Test Verification

Run the dedicated automated tests verifying touch target sizing, shelf locator rendering, mobile tab switching, and POS cart handoff:

```bash
npm test -- components/motomatcher/__tests__/comparison-matrix.test.tsx
```

Run TypeScript compilation and linter check:

```bash
npm run typecheck
npm run lint
```

---

## 2. Interactive Manual Verification Scenarios

### Scenario 1: Touch-Optimized Controls & Hit Targets
1. Navigate to `http://localhost:3000/staff/compat` on a browser or touch tablet.
2. Emulate a touch device (or open responsive design mode in DevTools at 768px or 1024px width).
3. Inspect the buttons:
   - Motorcycle selector chips, category filter chips, and "+ Add to POS Cart" buttons.
4. **Verify**:
   - Every primary interactive button has at least 44px height (`min-h-[44px]`).
   - Cards feature high contrast borders and clear visual feedback upon tap.

### Scenario 2: Prominent Physical Rack/Shelf Picking Coordinates
1. On the Staff MotoMatcher screen (`/staff/compat`), inspect the rendered part cards in both OEM and Aftermarket columns.
2. **Verify**:
   - Each card displays the standardized `<ShelfLocationTag />` badge.
   - Parts with assigned coordinates show a distinct map pin icon and `Rack X-YY / Shelf Z` in `bg-secondary-light text-secondary`.
   - Items without a storage bay display the amber `Unassigned Bay` warning badge with warning triangle.

### Scenario 3: Fast-Lane POS Hand-off
1. On any compatible part card, tap **"+ Add to Active POS Cart"**.
2. **Verify**:
   - The button instantly transitions to a green **"Added to Cart"** state with checkmark icon.
   - An accessible floating toast notification appears confirming the item was added.
   - Navigate to the POS view (`/staff/pos`); verify the item is staged in the active floor cart with matching price and SKU.

### Scenario 4: Responsive Mobile/Tablet Tab Switcher (< 768px)
1. Resize the browser viewport below 768px (e.g. 390px iPhone or 600px tablet portrait).
2. **Verify**:
   - The side-by-side dual columns collapse into an ergonomic segmented tab control:
     `[ OEM Standard (N) ]` | `[ Performance / Aftermarket (M) ]`.
   - Tapping either tab switches between the OEM and Aftermarket card sets with zero horizontal overflow.
   - Touch targets in the tab bar meet the minimum 44px height requirement.
