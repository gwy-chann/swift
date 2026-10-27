# Research & Technical Architecture: Admin Product Edit

**Feature**: `specs/108-admin-product-edit`  
**Jira Key**: [SIAA-108](https://the-three-devsketeers.atlassian.net/browse/SIAA-108)  
**Date**: 2026-10-27  

---

## 1. Technical Stack & Architectural Constraints

- **Framework**: Next.js 15+ (App Router with React 19 Client & Server Components).
- **Styling**: Tailwind CSS v4 strictly adhering to `.agents/rules/tailwind-v4.md` (native fractions like `aspect-1/1`, canonical utilities, `bg-linear-to-*`, no arbitrary bracket colors, zero hardcoded hex/rgb).
- **Design Tokens**: Standard SWIFT design tokens:
  - Surface backgrounds: `bg-bg-card`, `bg-bg-muted`, `bg-bg-surface`, `bg-bg-hover`
  - Text colors: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-light`
  - Borders: `border-border`, `border-border-subtle`, `border-border-strong`
  - Accents: `bg-primary`, `text-primary`, `bg-success`, `text-success`, `bg-danger`, `text-danger`, `bg-warning`, `text-warning`
- **Database & Storage**:
  - PostgreSQL table `public.products` (Supabase query with Prisma ORM fallback).
  - Server actions in `lib/admin/product-actions.ts`.
  - Client state store in `lib/store/inventory-store.ts`.

---

## 2. Component Architecture & UI Integration

### 2.1 Existing Catalog Flow
- In `components/admin/inventory/catalog-table.tsx`:
  - Each product row currently has an action column with an "Adjust" button calling `onAdjustStock(product.sku)`.
  - We will add an "Edit" action button alongside "Adjust", triggering `onEditProduct(product)`.
  - For non-admin accounts or when `canEdit` is false, the Edit button is either hidden or disabled.
- In `components/admin/inventory/inventory-catalog.tsx`:
  - Manage state `[editingProduct, setEditingProduct] = useState<Product | null>(null)` and `[isEditModalOpen, setIsEditModalOpen] = useState(false)`.
  - Render `<ProductEditModal isOpen={isEditModalOpen} product={editingProduct} onClose={...} onSubmit={handleUpdateProduct} />`.
  - When edit succeeds:
    1. Call `updateProduct(updatedData)` in `useInventoryStore` for instant optimistic update.
    2. Display toast notification: `Product "[name]" ([sku]) updated successfully!`.
    3. Close modal.

### 2.2 New Component: `ProductEditModal`
- Location: `components/admin/inventory/product-edit-modal.tsx`.
- Modal pre-populated with:
  - SKU (read-only, styled with lock icon / badge)
  - Current Stock (display-only info badge)
  - Part Name (`name`)
  - Category (`category`) with standard options (`Brakes`, `Drivetrain`, `Fluids & Oils`, `Ignition`, `Engine & Clutch`, `Tires`, etc.)
  - Brand (`brand`)
  - Motorcycle Model Compatibility (`model`)
  - Unit Cost (`cost`) in PHP
  - Retail Price (`retail`) in PHP with auto-suggest markup rule based on OEM status
  - Shelf Locator (`location`)
  - OEM Status (`oem`) toggle / radio pills
  - Product Description (`description`)
  - Image URL (`imageUrl`)
- Excluded from manual editing:
  - `sku`: Immutable.
  - `stock`: Cannot be edited directly here (prevents bypassing stock adjustment audit logs).
  - `minThreshold`: Managed system-wide.
  - `wholesale`: Recomputed via global markup rules based on cost and OEM status.

---

## 3. Server Action & Backend Execution: `updateProductAction`

### 3.1 Function Signature
```typescript
export interface UpdateProductPayload {
  sku: string;
  name: string;
  category: ProductCategory | string;
  brand: string;
  model?: string;
  cost: number;
  retail: number;
  location?: string;
  oem?: boolean;
  imageUrl?: string;
  description?: string;
  userName?: string;
  userRole?: string;
}

export interface UpdateProductResult {
  success: boolean;
  product?: Product;
  error?: string;
  code?: 'VALIDATION_ERROR' | 'PRODUCT_NOT_FOUND' | 'UNAUTHORIZED' | 'DATABASE_ERROR';
  fieldErrors?: Record<string, string>;
}
```

### 3.2 Dual-Engine Persistence
1. **Validation**: Check required fields (`sku`, `name`, `brand`), positive numeric values (`cost > 0`, `retail > 0`), and RBAC check (`userRole === 'admin'`).
2. **Wholesale Price Calculation**: Recompute wholesale price according to global markup rules (`calculateMarkupPrices(cost, oem)`).
3. **Supabase Update**:
   ```sql
   UPDATE public.products
   SET name = $name,
       category = $category,
       brand = $brand,
       model = $model,
       cost = $cost,
       wholesale = $wholesale,
       retail = $retail,
       location = $location,
       oem = $oem,
       image_url = $imageUrl,
       description = $description,
       updated_at = NOW()
   WHERE UPPER(sku) = UPPER($sku)
   RETURNING *;
   ```
4. **Prisma Fallback**:
   ```typescript
   prisma.product.update({
     where: { sku: normalizedSku },
     data: { ... }
   });
   ```
5. **Audit Logging**: Create audit log entry recording administrator name, timestamp, and updated SKU.
6. **Cache Revalidation**: `revalidatePath('/admin/inventory')`.
