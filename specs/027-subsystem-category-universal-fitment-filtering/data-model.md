# Data Model: Subsystem Category & Universal vs. Dedicated Fitment Filtering

**Feature**: `027-subsystem-category-universal-fitment-filtering`  
**Jira Issue**: [SIAA-26](https://the-three-devsketeers.atlassian.net/browse/SIAA-26) (STORY-4.4)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Domain Entities & Filter Models

### 1.1 Subsystem Category Definition (`SubsystemCategoryDefinition`)

Defines a motorcycle repair subsystem chip within the filter bar:

```typescript
export interface SubsystemCategoryDefinition {
  id: string; // e.g. "ALL", "Brakes", "Drivetrain", "Fluids", "Ignition", "Engine", "Tires", "Suspension", "Electrical", "Accessories"
  label: string; // User-facing label e.g. "Braking System", "Drive & CVT"
  shortLabel?: string; // Optional terse label for compact/mobile view e.g. "CVT"
  description?: string;
  aliases: string[]; // Category strings matching inventory products e.g. ["Drivetrain", "CVT", "Transmission"]
}
```

### 1.2 MotoMatcher Filter Options (`MotoMatcherFilterOptions`)

Input parameters driving the pure filtering engine:

```typescript
export interface MotoMatcherFilterOptions {
  /**
   * The currently active motorcycle model, or null if no specific model or in universal mode
   */
  selectedModel: MotorcycleModelRecord | null;

  /**
   * Whether the active platform selection itself is universal
   */
  isUniversalPlatform?: boolean;

  /**
   * Active subsystem category filter ("ALL" for all categories)
   */
  systemCategory: string;

  /**
   * Whether to include items marked with model === 'Universal' (default: true)
   */
  includeUniversal: boolean;
}
```

### 1.3 MotoMatcher Filtered Set (`MotoMatcherFilteredSet`)

Result structure holding both raw matched products and pre-partitioned comparison items with exact counters:

```typescript
export interface MotoMatcherFilteredSet {
  filteredProducts: Product[];
  oemParts: ComparisonPartItem[];
  aftermarketParts: ComparisonPartItem[];
  totalMatches: number;
  oemCount: number;
  aftermarketCount: number;
}
```

---

## 2. Canonical Subsystem Taxonomy & Mapping

```typescript
export const SUBSYSTEM_CATEGORIES: SubsystemCategoryDefinition[] = [
  {
    id: "ALL",
    label: "All Systems",
    shortLabel: "All",
    aliases: ["ALL", "*"],
  },
  {
    id: "Brakes",
    label: "Braking System",
    shortLabel: "Brakes",
    aliases: ["Brakes", "Braking", "Brake"],
  },
  {
    id: "Drivetrain",
    label: "Drive & CVT",
    shortLabel: "CVT",
    aliases: ["Drivetrain", "CVT", "Transmission", "Belt", "Drive"],
  },
  {
    id: "Fluids",
    label: "Oils & Fluids",
    shortLabel: "Fluids",
    aliases: ["Fluids", "Oils", "Oil", "Lubricants", "Chemicals"],
  },
  {
    id: "Ignition",
    label: "Ignition & Electrical",
    shortLabel: "Ignition",
    aliases: ["Ignition", "Electrical", "Battery", "Spark"],
  },
  {
    id: "Engine",
    label: "Engine & Clutch",
    shortLabel: "Engine",
    aliases: ["Engine", "Clutch", "Piston", "Gasket"],
  },
  {
    id: "Tires",
    label: "Tires & Wheels",
    shortLabel: "Tires",
    aliases: ["Tires", "Wheels", "Tire", "Wheel", "Rim"],
  },
  {
    id: "Suspension",
    label: "Suspension",
    shortLabel: "Suspension",
    aliases: ["Suspension", "Shocks", "Fork"],
  },
  {
    id: "Accessories",
    label: "Accessories",
    shortLabel: "Accessories",
    aliases: ["Accessories", "Body", "Lighting"],
  },
];
```

---

## 3. Pure Filter Invariants & Rules

1. **Platform Compatibility Matching**:
   - If `isUniversalPlatform === true`: product must have `p.model?.toLowerCase() === 'universal'`.
   - If `selectedModel` is provided:
     - Check dedicated model match: `partModel === queryModel || partModel === queryFullName || partModel.includes(queryModel)`.
     - Check universal match: `partModel === 'universal'`.
     - IF `options.includeUniversal === false`: universal match is disallowed, returning dedicated model parts ONLY.
2. **Subsystem Category Matching**:
   - If `options.systemCategory === 'ALL'`: all categories pass.
   - Otherwise, resolve `targetCategory` from `SUBSYSTEM_CATEGORIES.find(c => c.id === options.systemCategory)`.
   - A product passes if its `category` matches `targetCategory.id` or any of `targetCategory.aliases` (case-insensitive).
3. **Partitioning & Exact Counting**:
   - `oemParts = filteredProducts.filter(p => p.oem).map(fromProductToComparisonPart)`
   - `aftermarketParts = filteredProducts.filter(p => !p.oem).map(fromProductToComparisonPart)`
   - `totalMatches = filteredProducts.length`
   - `oemCount = oemParts.length`
   - `aftermarketCount = aftermarketParts.length`
   - Guarantee: `totalMatches === oemCount + aftermarketCount`.
