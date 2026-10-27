# Data Model Specification: Admin Product Edit

**Feature**: `specs/108-admin-product-edit/spec.md`  
**Date**: 2026-10-27  
**Jira Ticket**: [SIAA-108](https://the-three-devsketeers.atlassian.net/browse/SIAA-108)  

---

## 1. Domain Entities & Interfaces

### 1.1 Product Update Payload (`UpdateProductPayload`)
The core input data structure submitted when saving product edits:

```typescript
import type { ProductCategory } from '@/lib/types/product';

export interface UpdateProductPayload {
  sku: string;                    // Normalized, uppercase, immutable SKU identifier
  name: string;                   // Part name (required, non-empty)
  category: ProductCategory | string; // Subsystem category (Brakes, Drivetrain, etc.)
  brand: string;                  // Manufacturer / Brand (required, non-empty)
  model?: string;                 // Motorcycle model compatibility (defaults to "Universal")
  cost: number;                   // Unit purchase / supplier cost (PHP > 0)
  retail: number;                 // Selling retail price (PHP > 0)
  location?: string;              // Warehouse shelf locator (e.g., "RACK-A-01")
  oem?: boolean;                  // OEM Genuine (true) or Aftermarket (false)
  imageUrl?: string;              // Optional product photo URL
  description?: string;           // Optional multiline description
  userName?: string;              // Administrator full name for audit logging
  userRole?: string;              // Role verification ("admin" required)
}
```

### 1.2 Product Update Result (`UpdateProductResult`)
The server action response contract:

```typescript
import type { Product } from '@/lib/types/product';

export type UpdateProductErrorCode =
  | 'VALIDATION_ERROR'
  | 'PRODUCT_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'DATABASE_ERROR';

export interface UpdateProductResult {
  success: boolean;
  product?: Product;
  error?: string;
  code?: UpdateProductErrorCode;
  fieldErrors?: Record<string, string>;
}
```

### 1.3 Form State in Edit Modal (`ProductEditFormState`)
Component-level state tracking within `ProductEditModal`:

```typescript
export interface ProductEditFormState {
  name: string;
  category: string;
  brand: string;
  model: string;
  cost: string;                   // String representation for controlled text input
  retail: string;                 // String representation for controlled text input
  location: string;
  specType: 'aftermarket' | 'oem';
  description: string;
  imageUrl: string;
  manualRetailOverride: boolean;  // Tracks if admin manually changed auto-suggested retail price
  isSubmitting: boolean;
  errors: Record<string, string>;
}
```

---

## 2. Invariants & Business Rules

1. **SKU Immutability**: The SKU serves as the natural primary key across transactions, line items, and audit logs. It CANNOT be modified during editing.
2. **Stock Count Protection**: Stock on-hand is strictly read-only within `ProductEditModal`. Modifications to physical count must go through `StockAdjustmentModal` (`adjustProductStockAction`) with formal reason logging.
3. **Wholesale Price Governance**: Wholesale price is recomputed automatically from cost and markup rules (`calculateMarkupPrices(cost, oem)`), ensuring alignment with `/admin/rates`.
4. **Price Constraints**:
   - `cost > 0.00`
   - `retail > 0.00`
   - `retail >= cost` (recommended practice; warning displayed if retail < cost)
5. **Required String Fields**:
   - `name`: non-empty, trimmed.
   - `brand`: non-empty, trimmed.
   - `category`: non-empty, valid `ProductCategory`.
6. **Shelf Locator Formatting**: Normalized to trimmed uppercase (e.g. `rack-a-01` → `RACK-A-01`).
7. **Audit Logging**: Successful updates record an `AUD-*` log entry containing the user name, timestamp, and updated SKU.
