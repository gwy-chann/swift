# Implementation Tasks: Admin Ability to Edit Details of Existing Products in Inventory Catalog

**Feature**: `specs/108-admin-product-edit/spec.md`  
**Date**: 2026-10-27  
**Jira Ticket**: [SIAA-108](https://the-three-devsketeers.atlassian.net/browse/SIAA-108)  

---

## Phase 1: Contracts & Types

- [x] **TASK-1.1**: Define TypeScript interfaces `UpdateProductPayload`, `UpdateProductResult`, and `UpdateProductErrorCode` in `lib/admin/product-actions.ts` (and verify compatibility with `specs/108-admin-product-edit/contracts/product-edit.contract.ts`).

---

## Phase 2: Actions & Data Layer

- [x] **TASK-2.1**: Implement `updateProductAction(payload: UpdateProductPayload): Promise<UpdateProductResult>` in `lib/admin/product-actions.ts`:
  - Validate non-empty required fields (`sku`, `name`, `brand`, `category`) and positive numeric values (`cost > 0`, `retail > 0`).
  - Verify admin role privileges (RBAC check rejecting non-admins with `UNAUTHORIZED`).
  - Recompute wholesale price based on global markup rate rules (`calculateMarkupPrices(cost, oem)`).
  - Update product in PostgreSQL via Supabase client, with resilient fallback to Prisma ORM.
  - Record administrative audit log entry (`AUD-*`) on successful update.
  - Revalidate cache path `/admin/inventory`.

---

## Phase 3: Automated Unit & Integration Tests

- [x] **TASK-3.1**: Create `lib/inventory/__tests__/product-edit.test.ts` covering:
  - Validation rules (rejection of empty name/brand, negative or zero cost/retail).
  - Wholesale price auto-recalculation upon cost or OEM status changes.
  - RBAC protection (rejection of non-admin user role).
  - Store reactivity via `InventoryStore.updateProduct` updating product fields while preserving SKU and on-hand stock.

---

## Phase 4: UI Components Layer

- [x] **TASK-4.1**: Create `components/admin/inventory/product-edit-modal.tsx`:
  - Modal with accessible dialog ARIA attributes and focus management.
  - Pre-populated fields: Part Name, Category, Brand, Motorcycle Model Fitment, Unit Cost, Retail Price, Shelf Locator, OEM Status (Genuine vs Aftermarket), Description, Image URL.
  - Immutable SKU input (read-only with lock badge).
  - Informational current stock display (read-only, directing user to stock adjustment modal).
  - Exclude manual wholesale editing (auto-calculated from cost/OEM rate).
  - Exclude manual min stock threshold editing.
  - Form validation error display below respective inputs.
  - Save button with loading spinner state and cancel/close dismissal.
- [x] **TASK-4.2**: Update `components/admin/inventory/catalog-table.tsx`:
  - Add "Edit" action button with Lucide `Pencil` icon alongside existing "Adjust" button.
  - Trigger `onEditProduct(product)` callback when clicked.
  - Honor `canEdit` permission prop (hide or disable when user lacks admin privileges).
- [x] **TASK-4.3**: Integrate `ProductEditModal` in `components/admin/inventory/inventory-catalog.tsx`:
  - Manage state for `editingProduct` and `isEditModalOpen`.
  - Wire `handleUpdateProduct` handler calling `updateProductAction`.
  - Perform instant optimistic store update via `updateProduct` in `InventoryStore`.
  - Display success/error toast notifications and close modal.

---

## Phase 5: Verification & Convergence

- [x] **TASK-5.1**: Run `npm test` to verify 100% pass rate on test suites.
- [x] **TASK-5.2**: Run `npx tsc --noEmit` to verify zero TypeScript errors.
- [x] **TASK-5.3**: Run `npm run lint` to verify ESLint cleanliness.
- [x] **TASK-5.4**: Execute Atomic Commits with Jira key `[SIAA-108]` following `.agents/rules/atomic-commit.md`.
