# Quickstart Guide: Motorcycle Make, Model & Displacement Selector Engine

**Feature**: `024-motorcycle-model-displacement-selector`  
**Jira Ticket**: [SIAA-23](https://the-three-devsketeers.atlassian.net/browse/SIAA-23) (STORY-4.1)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Quick Verification & Test Run

Run the dedicated test suite for the Motorcycle Selector contracts, pure filters, and React components:

```bash
# Run unit and component test suites
npm test -- lib/motomatcher/__tests__/motorcycle-selector.test.ts
npm test -- components/motomatcher/__tests__/motorcycle-selector.test.tsx

# Run full project typecheck
npm run typecheck
```

---

## 2. Interactive Walkthrough Scenarios

### Scenario 1: Default Selection on Admin MotoMatcher Portal
1. Navigate to `http://localhost:3000/admin/motomatcher`.
2. Notice the "Select Motorcycle Make, Model & Displacement" card grid.
3. Verify that the first model (**Yamaha NMAX 155**) is automatically highlighted with active border (`border-primary`), soft background tint (`bg-primary-light`), and active indicator badge.
4. Verify the registered platforms count matches the loaded list.

### Scenario 2: Instant Model Switching (< 50ms)
1. Click on the **Honda Click 125i/150i** card.
2. Confirm the active highlight instantly moves to Honda Click without page flicker or lag.
3. Press `Tab` to navigate to **Suzuki Raider 150 Fi** and press `Enter` or `Space`.
4. Confirm the active card switches to Suzuki Raider 150 Fi.

### Scenario 3: Real-Time Search & Brand Filtering
1. In the search input field, type `"ADV"`.
2. Notice the model grid instantly updates to show only **Honda ADV 160**.
3. Clear the search input or click the "X" button.
4. Click the **"Yamaha"** brand filter pill.
5. Notice only Yamaha platforms (NMAX 155, Aerox 155) appear.
6. Click **"All Brands"** to restore all motorcycle models.

### Scenario 4: Empty Search State & Universal Parts Prompt
1. Type a non-matching motorcycle query, e.g. `"Ducati Panigale"` or `"Vespa"`.
2. Verify that an empty state container renders with:
   - Message: `"No matching motorcycle model found for '...'"`
   - Action 1: `"Clear Search"`
   - Action 2: `"View Universal / Multi-Fit Parts"`
3. Click `"View Universal / Multi-Fit Parts"`.
4. Confirm the view switches to display universal compatibility.

### Scenario 5: Staff Floor Terminal Integration
1. Navigate to `http://localhost:3000/staff/compat`.
2. Verify that the visual `MotorcycleSelector` is rendered at the top of the compatibility view.
3. Select any motorcycle model (e.g. Yamaha Aerox 155).
4. Verify that the compatible parts list below re-filters dynamically for that model.
