# Technical Research & Architectural Decisions: Subsystem Category & Universal Fitment Filtering

**Feature**: Subsystem Category & Universal vs. Dedicated Fitment Filtering  
**Jira Issue**: [SIAA-26](https://the-three-devsketeers.atlassian.net/browse/SIAA-26)  
**Spec Reference**: [`specs/027-subsystem-category-universal-fitment-filtering/spec.md`](spec.md)  

---

## 1. Architectural Strategy & Pure Filtering Function

### Design Decision: Separation of Pure Filtering Logic and UI Components
To ensure maximum testability and prevent duplicate filtering code between `/staff/compat` (touch terminal staff view) and `/admin/motomatcher` (backoffice desktop view), all filtering rules are encapsulated in a pure, zero-dependency helper:

```ts
// lib/motomatcher/subsystem-filter.ts
export interface MotoMatcherFilterOptions {
  selectedModel: MotorcycleModelRecord | null;
  isUniversalPlatform?: boolean;
  systemCategory: string; // "ALL" or specific category
  includeUniversal: boolean; // default true
}

export function filterMotoMatcherProducts(
  products: Product[],
  options: MotoMatcherFilterOptions
): Product[];
```

### Benefits:
1. **100% Automated Unit Testability**: Filter logic can be verified with synthetic mock product arrays under Node test runner without React component mounting.
2. **Deterministic State Synchronization**: Both admin and staff clients pass their local or fetched product arrays through the same pure filter.
3. **Single Source of Truth for Subsystems**: Category aliases, label mappings, and universal fitment criteria are centralized in one file.

---

## 2. Subsystem Taxonomy & Normalization Matrix

Motorcycle inventory categories often vary slightly by supplier or import batch (e.g., `CVT` vs `Drivetrain`, `Fluids` vs `Oils & Fluids`). The filter engine implements canonical subsystem grouping:

| Subsystem ID | Display Label | Matching Product Categories | Typical Motorcycle Parts |
|:---|:---|:---|:---|
| `ALL` | All Systems / Parts | All categories | Complete platform catalog |
| `Brakes` | Braking System | `Brakes`, `Braking` | Brake pads, discs, calipers, brake fluid |
| `Drivetrain` | Drive & CVT | `Drivetrain`, `CVT`, `Transmission` | Drive belts, rollers, pulley, clutch bell |
| `Fluids` | Oils & Fluids | `Fluids`, `Oils`, `Lubricants` | 4T engine oil, gear oil, fork oil, coolant |
| `Ignition` | Ignition & Electrical | `Ignition`, `Electrical` | Spark plugs, ignition coil, stator, ECU |
| `Engine` | Engine & Clutch | `Engine`, `Clutch` | Piston kits, valves, gaskets, clutch springs |
| `Tires` | Tires & Wheels | `Tires`, `Wheels` | Front/rear tires, inner tubes, rims |
| `Suspension` | Suspension | `Suspension`, `Shocks` | Front fork springs, rear shock absorbers |
| `Accessories` | Accessories | `Accessories`, `Body` | Mirrors, phone mounts, top box brackets |

---

## 3. Universal Parts Filtering Logic

Universal parts in SWIFT are tagged with `model: 'Universal'` (case-insensitive) or `fitment_type: 'universal'`.

- **When `includeUniversal === true`**:
  - If a specific model is selected (e.g. Yamaha NMAX 155), the result set contains:
    `[Dedicated Model Parts] + [Universal Parts matching active category]`
  - This is helpful when mechanics want to see all usable items including universal fluids, spark plugs, or tires.
- **When `includeUniversal === false`**:
  - The result set contains:
    `[Dedicated Model Parts ONLY]`
  - All parts where `(p.model || '').toLowerCase() === 'universal'` or `p.isUniversal === true` are strictly filtered out.
  - This allows mechanics to troubleshoot model-specific mechanical assemblies (e.g. dedicated NMAX brake pads, specific Click drive belts) without consumable clutter.

---

## 4. Reusable `<SubsystemFilterBar />` Component Design

To provide unified UX across both Staff and Admin portals, a dedicated component `<SubsystemFilterBar />` is introduced:

```tsx
// components/motomatcher/subsystem-filter-bar.tsx
export interface SubsystemFilterBarProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  includeUniversal: boolean;
  onToggleUniversal: (include: boolean) => void;
  totalMatches?: number;
  oemCount?: number;
  aftermarketCount?: number;
  className?: string;
}
```

### Visual & Accessibility Guidelines:
- Horizontal scrolling pill container on mobile screens (`overflow-x-auto no-scrollbar`).
- Active pill styled with `bg-primary text-white border-primary shadow-xs`.
- Inactive pills styled with `bg-bg-card border-border text-text-secondary hover:text-text-primary`.
- Toggle switch styled with `bg-primary` when checked, `bg-bg-muted` when unchecked, with smooth slider animation.
- Semantic HTML (`role="toolbar"` or `role="radiogroup"`) and keyboard focus indicators (`focus-visible:ring-2 focus-visible:ring-primary`).

---

## 5. Performance & React Rendering Optimization

- Filtering is calculated via `useMemo` based on `[products, selectedModel, isUniversalPlatform, systemCategory, includeUniversal]`.
- For lists under 1,000 inventory items, synchronous client filtering executes in `< 2ms`, well within the 16ms frame budget (60 FPS).
- Zero external dependencies required; uses existing Lucide icons (`Filter`, `Layers`, `SlidersHorizontal`, `Check`).
