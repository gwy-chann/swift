# Implementation Plan: Admin Ability to Edit Details of Existing Products in Inventory Catalog

**Feature Branch**: `feat/SIAA-108-admin-product-edit`  
**Spec**: [spec.md](./spec.md)  
**Jira Ticket**: [SIAA-108](https://the-three-devsketeers.atlassian.net/browse/SIAA-108)  
**Date**: 2026-10-27  

---

## 1. Technical Context & System Boundaries

- **UI Layer**:
  - `components/admin/inventory/catalog-table.tsx`: Add "Edit" button to row action column alongside "Adjust". Accept `onEditProduct?: (product: Product) => void` and `canEdit?: boolean`.
  - `components/admin/inventory/product-edit-modal.tsx` (NEW): Pre-populated modal with form fields, validation errors, OEM toggle, auto-calculated wholesale display, and disabled SKU/Stock.
  - `components/admin/inventory/inventory-catalog.tsx`: Integrate `ProductEditModal`, manage open/close state, invoke `updateProductAction`, update client `inventory-store`, and dispatch toast notifications.
- **Service & Server Action Layer**:
  - `lib/admin/product-actions.ts`: Add `updateProductAction(payload: UpdateProductPayload): Promise<UpdateProductResult>`. Enforce RBAC, input validation, wholesale recomputation, Supabase update, Prisma fallback, audit logging, and `revalidatePath('/admin/inventory')`.
- **Validation & Domain Logic**:
  - `lib/inventory/product-validation.ts` or `lib/inventory/product-registration.ts`: Reusable validation logic for updating product records.
- **Client State Management**:
  - `lib/store/inventory-store.ts`: Utilize existing `updateProduct(partialProduct)` to provide instant optimistic updates.
- **Automated Tests**:
  - `lib/inventory/__tests__/product-edit.test.ts` (NEW): Unit tests for payload validation, wholesale recalculation, and server action behavior.

---

## 2. Constitution & Quality Gates Check

- **Principle I: Design Tokens & Zero Hardcoded Colors**: Strictly use semantic classes (`bg-bg-card`, `bg-bg-muted`, `border-border`, `text-text-primary`, `bg-primary`, etc.). Zero hex or rgb in JSX/CSS.
- **Principle II: Specification Fidelity**: Fulfill all 5 Gherkin scenarios from SIAA-108.
- **Principle III: Type-Safe Data Architecture**: Full TypeScript typing for all payloads and returns with zero `any`.
- **Principle IV: Test-First Quality**: Implement comprehensive test suite before finalizing code.
- **Principle V: Accessibility & Performance**: Accessible ARIA modal attributes (`role="dialog"`, `aria-labelledby`, `aria-modal="true"`, focus trap / keyboard dismiss on ESC).
- **Tailwind CSS v4 Guidelines**: Use canonical utilities and native ratios (`aspect-1/1`, `bg-linear-to-*`).

---

## 3. Implementation Phases & Milestones

### Phase 1: Contracts & Server Action (`updateProductAction`)
- Define `UpdateProductPayload` and `UpdateProductResult` in `lib/admin/product-actions.ts`.
- Implement validation helper `validateProductUpdateInput(payload)`.
- Implement `executeSupabaseUpdateProduct` with fallback to `executePrismaUpdateProduct`.
- Wire audit logging for product edits.
- Write unit tests in `lib/inventory/__tests__/product-edit.test.ts`.

### Phase 2: UI Component (`ProductEditModal`)
- Create `components/admin/inventory/product-edit-modal.tsx`.
- Include all fields from SIAA-108: Part Name, Category, Brand, Motorcycle Model Compatibility, Unit Cost, Retail Price, Shelf Locator, OEM Status, Description, Image URL.
- Make SKU read-only/disabled with lock icon.
- Display stock count as informational badge without edit input.
- Exclude wholesale price from manual editing (recalculate automatically based on cost and OEM status).
- Exclude minimum stock threshold from manual editing.
- Display inline field errors.

### Phase 3: Catalog Integration & Reactive Feedback
- Update `components/admin/inventory/catalog-table.tsx` to include the `Edit` button with Lucide `Pencil` icon.
- Connect `ProductEditModal` inside `components/admin/inventory/inventory-catalog.tsx`.
- Connect `handleUpdateProduct` handler:
  - Call `updateProductAction`.
  - Update `inventory-store` via `updateProduct(...)`.
  - Trigger toast feedback.
  - Close modal.

### Phase 4: Verification, Lint & Test Gates
- Run `npm test` to verify all tests pass.
- Run `npx tsc --noEmit` to verify type safety.
- Run `npm run lint` to verify ESLint compliance.
