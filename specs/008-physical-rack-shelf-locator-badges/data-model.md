# Data Model: Shelf Locator Mapping

- **Feature**: `SIAA-14`

## 1. Product Location Entity Model

The `Product.location` field in `@/lib/types/product` stores physical bin positioning.

```typescript
export interface Product {
  // ... other fields
  location: string; // Shelf / Rack locator e.g. "Rack A-01 / Shelf 2", or "" for unassigned
}
```

## 2. Parsed Location Domain Object

```typescript
export interface ParsedShelfLocation {
  isAssigned: boolean;
  zoneOrRack: string;
  shelfOrBin?: string;
  formatted: string;
}
```

## 3. Location States Matrix

| Location String Value | `isAssigned` | Display Badge | Theme Token Class |
| :--- | :--- | :--- | :--- |
| `"Rack A-01 / Shelf 2"` | `true` | `Rack A-01 / Shelf 2` | `bg-secondary-light text-secondary border-secondary/20` |
| `"Aisle 1 / Shelf 1"` | `true` | `Aisle 1 / Shelf 1` | `bg-secondary-light text-secondary border-secondary/20` |
| `"Tire Rack 2 / Floor"` | `true` | `Tire Rack 2 / Floor` | `bg-secondary-light text-secondary border-secondary/20` |
| `""` or `"   "` | `false` | `Unassigned Bay` | `bg-accent-light text-accent border-accent/30` |
| `undefined` / `null` | `false` | `Unassigned Bay` | `bg-accent-light text-accent border-accent/30` |
| `"Unassigned"` | `false` | `Unassigned Bay` | `bg-accent-light text-accent border-accent/30` |
