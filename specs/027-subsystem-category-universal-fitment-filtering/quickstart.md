# Quickstart & Verification Guide: Subsystem Category & Universal vs. Dedicated Fitment Filtering

**Feature**: `027-subsystem-category-universal-fitment-filtering`  
**Jira Ticket**: [SIAA-26](https://the-three-devsketeers.atlassian.net/browse/SIAA-26) (STORY-4.4)  

---

## 1. Automated Test Verification

Run the dedicated unit test suite verifying subsystem filtering, category alias matching, universal exclusion, reset action, and count synchronizations:

```bash
npm test -- lib/motomatcher/__tests__/subsystem-filter.test.ts
```

Run TypeScript compilation check to verify strict type safety across all components and consumers:

```bash
npm run typecheck
```

---

## 2. Interactive Manual Verification Scenarios

### Scenario 1: Subsystem Category Pill Filtering
1. Open the Staff Terminal at `http://localhost:3000/staff/compat` or Admin MotoMatcher at `http://localhost:3000/admin/motomatcher`.
2. Select an active motorcycle model (e.g. **Yamaha NMAX 155**).
3. Click the **"Braking System"** (or **"Brakes"**) category pill in the filter bar.
4. **Verify**:
   - Both the OEM column and the Aftermarket column filter synchronously to display only brake components (e.g. front brake pads).
   - Unrelated items (such as drive belts or spark plugs) are hidden.
   - The selected category pill receives active styling (`bg-primary text-white`).

### Scenario 2: "All Categories" Reset Action
1. With the "Braking System" filter active, click the **"All Systems"** (or **"All Parts"**) pill.
2. **Verify**:
   - The filter immediately clears (< 16ms).
   - The full matrix of compatible parts across all subsystems (Brakes, CVT, Fluids, Ignition, Tires) is restored.
   - The "All Systems" pill receives active styling.

### Scenario 3: Universal Parts Visibility Toggle
1. In the MotoMatcher matrix view, locate the **"Include Universal Parts"** toggle switch in the filter bar (checked by default).
2. Uncheck / toggle the switch to disabled.
3. **Verify**:
   - All universal items (e.g., Motul 3100 Gold 4T, Shell Advance AX7, universal fluids) disappear from the matrix.
   - Only dedicated, model-specific parts matching the active motorcycle (e.g., Yamaha Genuine NMAX parts, RCB NMAX pads) remain visible.
4. Toggle "Include Universal Parts" back to enabled.
5. **Verify**:
   - Universal items reappear immediately in the Aftermarket column.

### Scenario 4: Dynamic Header Counter Badges
1. Observe the counter badges in the column headers and summary banner:
   - Header indicators: `OEM Standard Factory Parts (X)` and `Performance / Aftermarket (Y)`.
   - Summary banner: `Total Matches: Z • OEM: X • Aftermarket: Y`.
2. Switch between different category chips (e.g. from "All Systems" to "Drive & CVT").
3. **Verify**:
   - The counter values update synchronously and exactly match the visible card count in each column (`X + Y === Z`).
4. Toggle "Include Universal Parts" off.
5. **Verify**:
   - Counters decrease accordingly by the count of excluded universal items.

### Scenario 5: Cross-Portal Synchronization & Design Token Adherence
1. Test filtering on both `/staff/compat` and `/admin/motomatcher`.
2. Toggle between Light Mode and Dark Mode.
3. **Verify**:
   - All chips, badges, and toggle switches adapt seamlessly without hardcoded hex colors or contrast regressions.
   - Mobile responsive layout allows horizontal scrolling of category chips without breaking page layout.
