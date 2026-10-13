# Technical Research & Architecture Decisions: Motorcycle Make, Model & Displacement Selector Engine

**Feature**: `024-motorcycle-model-displacement-selector`  
**Jira Issue**: [SIAA-23](https://the-three-devsketeers.atlassian.net/browse/SIAA-23) (STORY-4.1)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Technical Context & Baseline Architecture

### 1.1 Existing Implementations & Prerequisite Work
1. **Schema & Database Layer**:
   - `supabase/migrations/20261011000000_motomatcher_compatibility.sql` defined `public.motorcycle_models` with fields: `id`, `make`, `model`, `displacement_cc`, `year_start`, `year_end`, `category`, and `image_url`.
2. **Domain Contracts & Types**:
   - `lib/types/product.ts` defines `MotorcycleModelRecord`.
   - `lib/mock-data/motorcycles.ts` provides `MOCK_MOTORCYCLE_MODEL_RECORDS` as reliable fallback baseline for 5 popular Philippine models:
     - Yamaha NMAX 155 (155cc, 2020-2026)
     - Yamaha Aerox 155 (155cc, 2019-2026)
     - Honda Click 125i/150i (150cc, 2018-2026)
     - Honda ADV 160 (160cc, 2022-2026)
     - Suzuki Raider 150 Fi (150cc, 2017-2026)
3. **Data Fetching Actions**:
   - `lib/actions/motomatcher-actions.ts` provides `getMotorcycleModelsAction()` querying Supabase with automatic fallback to mock data.
4. **Current Route Shells**:
   - `app/admin/motomatcher/page.tsx`: Currently an async Server Component rendering a static grid of registered platforms without interactive selection or search.
   - `app/staff/compat/page.tsx`: Currently a Client Component using standard HTML `<select>` dropdowns for make/model/category, without the visual card grid selector specified in the mockup and Jira story.

---

## 2. Architectural Decisions & Patterns

### Decision 1: Dedicated Reusable `MotorcycleSelector` Component
- **Location**: `components/motomatcher/motorcycle-selector.tsx`
- **Pattern**: Controlled or uncontrolled client component (`'use client'`).
- **Props**:
  - `models: MotorcycleModelRecord[]` (pre-fetched or default list)
  - `selectedModelId?: string | null`
  - `onSelectModel: (model: MotorcycleModelRecord | null) => void`
  - `onSelectUniversal?: () => void`
  - `compact?: boolean` (for tight mobile or floor terminal layouts)
- **Rationale**: Isolates the search input, brand filter pills, responsive card grid, and empty state into a composable component usable across both `/admin/motomatcher` and `/staff/compat`.

### Decision 2: Sub-50ms Client-Side Filtering
- **Implementation**: Pure in-memory filtering with `useMemo`.
- **Search Scope**: Case-insensitive substring matching against:
  - `model.make` (e.g., "Yamaha", "Honda", "Suzuki")
  - `model.model` (e.g., "NMAX", "Click", "Aerox", "Raider", "ADV")
  - `model.displacement_cc` (e.g., "155", "150", "160", "125")
  - `model.category` (e.g., "Scooter", "Underbone")
- **Rationale**: The motorcycle catalog in standard shop operations contains 50-200 distinct platform models. Client-side filtering executes in < 2ms, easily surpassing the < 50ms user acceptance threshold.

### Decision 3: SWIFT Semantic Design Tokens & Tailwind v4
- **Mockup Reference**: `../mockup/admin.html` (`.model-selection-grid`, `.model-card.active`) and `../mockup/style.css`.
- **Active State Tokens**:
  - Unselected Card: `bg-bg-card border-border hover:border-primary/50 text-text-primary`
  - Active Card: `border-primary bg-primary-light text-primary shadow-xs ring-1 ring-primary/20`
  - Brand Tag: `text-primary font-extrabold text-[10px] uppercase tracking-wider`
  - Model Name: `font-bold text-text-primary text-sm`
  - Displacement / Year: `text-text-muted text-xs font-mono`
- **Zero Hardcoded Colors**: Strict adherence to tokens in `app/globals.css` and `lib/tokens.ts`.

### Decision 4: Keyboard Accessibility & ARIA Role
- Model grid uses `role="radiogroup"` with cards having `role="radio"` and `aria-checked={isSelected}`.
- Cards are interactive buttons with `tabIndex={0}` and respond to `Enter` and `Space`.

---

## 3. Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| Active model filtered out by search input | Keep the underlying `selectedModelId` intact so clearing the query immediately reveals the selection without loss of context. |
| Supabase connection offline during SSR | `getMotorcycleModelsAction()` already features automated fallback to `MOCK_MOTORCYCLE_MODEL_RECORDS`. |
| Staff portal compatibility query mismatch | Provide a clean adapter to emit either full `MotorcycleModelRecord` or formatted string (`"${make} ${model}"`) for backwards compatibility with existing inventory queries. |
