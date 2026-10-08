# Quickstart & Verification Guide: Shelf Locator Badges

- **Feature**: `SIAA-14`

## 1. Running Unit Tests
```bash
npm test
```

## 2. Verifying Components
Import `<ShelfLocationTag>`:
```tsx
import { ShelfLocationTag } from '@/components/inventory/shelf-location-tag';

// Assigned bay:
<ShelfLocationTag location="Rack A-01 / Shelf 2" />

// Unassigned bay fallback (renders amber warning badge):
<ShelfLocationTag location="" />
```

## 3. Verifying Catalog Search by Location
In the admin inventory page (`/admin/inventory`), search for:
- `"Rack A-01"` -> filters parts in Rack A-01
- `"Shelf 2"` -> filters parts located on Shelf 2
- `"Unassigned"` -> filters parts with unassigned bay
