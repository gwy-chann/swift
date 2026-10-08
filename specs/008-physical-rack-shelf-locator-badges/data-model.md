# Data Model: Shelf Locator Mapping & Navigation Badges

**Feature**: `Physical Rack & Shelf Locator Mapping & Warehouse Navigation Badges`  
**Ticket**: `SIAA-14`  

---

## 1. Entities & Fields

### Product Entity (Catalog Item)

The core motorcycle part record containing physical storage location coordinates.

```typescript
export interface Product {
  sku: string;
  name: string;
  category: string;
  stock: number;
  minThreshold: number;
  /**
   * Warehouse storage coordinates (e.g., "Rack A-01 / Shelf 2", "Aisle 1 / Shelf 1", or "" for unassigned).
   */
  location: string;
  cost: number;
  wholesale: number;
  retail: number;
  oem: boolean;
  model: string;
  brand: string;
}
```

### ParsedShelfLocation (Domain Value Object)

Structured representation of parsed physical storage coordinates.

```typescript
export interface ParsedShelfLocation {
  /**
   * True if location represents a valid, non-empty storage assignment.
   */
  isAssigned: boolean;

  /**
   * Zone, aisle, or rack descriptor (e.g. "Rack A-01", "Aisle 1", "Tire Rack 2").
   * Defaults to empty string when unassigned.
   */
  zoneOrRack: string;

  /**
   * Specific shelf tier or bin descriptor (e.g. "Shelf 2", "Floor", "Bin 4").
   * Optional if location is single-token (e.g., "Showroom").
   */
  shelfOrBin?: string;

  /**
   * Normalized display string (e.g. "Rack A-01 / Shelf 2" or "Unassigned Bay").
   */
  formatted: string;
}
```

---

## 2. Validation Rules

- **VR-LOC-01 (Assigned Criteria)**: A location is assigned (`isAssigned === true`) if and only if `location` is non-null, defined, non-empty, and contains non-whitespace characters other than the case-insensitive word `"unassigned"`.
- **VR-LOC-02 (Delimiter Parsing)**: If `location` contains `" / "`, `" /"`, `"/ "`, or `"/"`, the substring preceding the delimiter is assigned to `zoneOrRack` and the substring following is assigned to `shelfOrBin`. Both are trimmed.
- **VR-LOC-03 (Single-Token Preservation)**: If `location` contains no delimiter (e.g. `"Mezzanine"`), `zoneOrRack` receives the trimmed string and `shelfOrBin` is `undefined`.
- **VR-LOC-04 (Fallback Format)**: When `isAssigned === false`, `formatted` MUST strictly equal `"Unassigned Bay"`.

---

## 3. Location States & Visual Badge Matrix

| Input `location` Value | `isAssigned` | `zoneOrRack` | `shelfOrBin` | `formatted` | Visual Badge Class | Icon |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `"Rack A-01 / Shelf 2"` | `true` | `"Rack A-01"` | `"Shelf 2"` | `"Rack A-01 / Shelf 2"` | `.shelf-location-tag` (`bg-secondary-light text-secondary border-secondary/20`) | `MapPin` |
| `"Aisle 1 / Shelf 1"` | `true` | `"Aisle 1"` | `"Shelf 1"` | `"Aisle 1 / Shelf 1"` | `.shelf-location-tag` (`bg-secondary-light text-secondary border-secondary/20`) | `MapPin` |
| `"Tire Rack 2 / Floor"` | `true` | `"Tire Rack 2"` | `"Floor"` | `"Tire Rack 2 / Floor"` | `.shelf-location-tag` (`bg-secondary-light text-secondary border-secondary/20`) | `MapPin` |
| `"Showroom"` | `true` | `"Showroom"` | `undefined` | `"Showroom"` | `.shelf-location-tag` (`bg-secondary-light text-secondary border-secondary/20`) | `MapPin` |
| `""` | `false` | `""` | `undefined` | `"Unassigned Bay"` | `shelf-location-unassigned` (`bg-accent-light text-accent border-accent/30`) | `AlertTriangle` |
| `"   "` (whitespace) | `false` | `""` | `undefined` | `"Unassigned Bay"` | `shelf-location-unassigned` (`bg-accent-light text-accent border-accent/30`) | `AlertTriangle` |
| `null` / `undefined` | `false` | `""` | `undefined` | `"Unassigned Bay"` | `shelf-location-unassigned` (`bg-accent-light text-accent border-accent/30`) | `AlertTriangle` |
| `"Unassigned"` | `false` | `""` | `undefined` | `"Unassigned Bay"` | `shelf-location-unassigned` (`bg-accent-light text-accent border-accent/30`) | `AlertTriangle` |
