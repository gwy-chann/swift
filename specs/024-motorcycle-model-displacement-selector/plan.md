# Implementation Plan: Motorcycle Make, Model & Displacement Selector Engine

**Feature**: `024-motorcycle-model-displacement-selector`  
**Jira Ticket**: [SIAA-23](https://the-three-devsketeers.atlassian.net/browse/SIAA-23) (STORY-4.1)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Architecture Overview & Component Boundaries

```text
app/admin/motomatcher/page.tsx (Server Component)
    │
    ▼ fetches models via getMotorcycleModelsAction()
app/admin/motomatcher/admin-motomatcher-client.tsx (Client Component)
    │
    ├── components/motomatcher/motorcycle-selector.tsx (Client Component)
    │     ├── Search & Filter Bar (input + clear button)
    │     ├── Brand Filter Chips (All, Yamaha, Honda, Suzuki, Universal)
    │     ├── Model Selection Grid (cards with active highlight)
    │     └── Empty Model State with Universal prompt
    │
    └── MotoMatcher Comparison Matrix (OEM vs Aftermarket parts list)

app/staff/compat/page.tsx (Client Component)
    │
    ├── components/motomatcher/motorcycle-selector.tsx (Client Component)
    └── Staff Floor Fitment Parts List & Shelf Locator
```

---

## 2. Component Hierarchy & File Targets

1. **`components/motomatcher/motorcycle-selector.tsx`**:
   - Reusable visual selector grid.
   - Props:
     - `models: MotorcycleModelRecord[]`
     - `selectedModelId?: string | null`
     - `onSelectModel: (model: MotorcycleModelRecord | null) => void`
     - `onSelectUniversal?: () => void`
     - `compact?: boolean`
     - `className?: string`
   - Features: Search input with clear button, brand filter pills, interactive cards (`border-primary`, `bg-primary-light` on active), ARIA accessibility.
2. **`app/admin/motomatcher/admin-motomatcher-client.tsx`**:
   - Client wrapper for the Admin MotoMatcher view, integrating `MotorcycleSelector` with the parts comparison view.
3. **`app/admin/motomatcher/page.tsx`**:
   - Server Component prefetching models via `getMotorcycleModelsAction()` and passing them to `AdminMotoMatcherClient`.
4. **`app/staff/compat/page.tsx`**:
   - Upgrade the existing form dropdowns to incorporate `MotorcycleSelector` for fast 1-click model selection.

---

## 3. Design Tokens Mapping (SWIFT Design System)

| UI Element | Tailwind Utility Classes | Semantic Token |
| :--- | :--- | :--- |
| Selector Container | `bg-bg-surface border-border rounded-xl shadow-xs` | `--bg-surface`, `--border-color` |
| Search Input | `bg-bg-input border-border text-text-primary focus:border-primary` | `--bg-input`, `--primary` |
| Brand Filter Pill (Normal) | `bg-bg-card border-border text-text-secondary hover:border-primary/50` | `--bg-card`, `--text-secondary` |
| Brand Filter Pill (Active) | `bg-primary text-white border-primary` | `--primary` |
| Model Card (Normal) | `bg-bg-card border-border hover:border-primary/50 text-text-primary` | `--bg-card`, `--border-color` |
| Model Card (Active) | `border-primary bg-primary-light text-primary ring-1 ring-primary/20` | `--primary`, `--primary-light` |
| Make Tag | `text-primary font-bold text-[10px] uppercase` | `--primary` |
| Model Name | `text-text-primary font-bold text-sm` | `--text-primary` |
| Displacement / Year | `text-text-muted text-xs font-mono` | `--text-muted` |
| Empty State Container | `bg-bg-card border-border rounded-lg text-text-muted` | `--bg-card`, `--text-muted` |

---

## 4. Test Strategy

1. **Unit Tests (`lib/motomatcher/__tests__/motorcycle-selector.test.ts`)**:
   - Validate pure filter function `matchesMotorcycleFilter`:
     - Text search across make, model, displacement, and category.
     - Brand pill filtering (e.g. "Yamaha" excludes "Honda").
     - Partial match and case insensitivity.
     - Empty query returns all models.
2. **Component Tests (`components/motomatcher/__tests__/motorcycle-selector.test.tsx`)**:
   - Verify initial render highlights first model by default.
   - Verify clicking another card switches active styling instantly.
   - Verify typing in search box filters the card list.
   - Verify empty state appears when typing non-existent model name with prompt to view universal parts.
   - Verify keyboard navigation (`Enter` / `Space` selects a card).
3. **Integration & E2E Validation**:
   - `npm run typecheck`
   - `npm test`
   - Route verification for `/admin/motomatcher` and `/staff/compat`.

---

## 5. Atomic Commit Decomposition Plan

Following `.agents/rules/atomic-commit.md`:
- **Unit 1 (Docs & Specs)**: `docs(specs): [SIAA-23] add specification, planning, data model, and checklist artifacts for motorcycle selector engine`
- **Unit 2 (Contracts & Logic)**: `feat(motomatcher): [SIAA-23] implement motorcycle selector contracts and pure filter predicates with unit tests`
- **Unit 3 (UI Component)**: `feat(motomatcher): [SIAA-23] create reusable MotorcycleSelector component with instant search, brand pills, and accessible cards`
- **Unit 4 (Route Integration)**: `feat(motomatcher): [SIAA-23] integrate MotorcycleSelector into admin and staff compatibility views`
- **Unit 5 (Docs & Tasks Sync)**: `docs(specs): [SIAA-23] mark all implementation and verification tasks complete in tasks.md`
