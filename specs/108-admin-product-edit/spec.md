# Feature Specification: Admin Ability to Edit Details of Existing Products in Inventory Catalog

**Feature Branch**: `feat/SIAA-108-admin-product-edit`  
**Created**: 2026-10-27  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-108](https://the-three-devsketeers.atlassian.net/browse/SIAA-108) (STORY-4.14)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Master Product Catalog & Multi-Tier Pricing)  
**Prerequisites**: [SIAA-13](https://the-three-devsketeers.atlassian.net/browse/SIAA-13) (Master Parts Catalog Search), [SIAA-14](https://the-three-devsketeers.atlassian.net/browse/SIAA-14) (Physical Rack & Shelf Locator Badges), [SIAA-15](https://the-three-devsketeers.atlassian.net/browse/SIAA-15) (Interactive Stock Adjustment Engine), [SIAA-16](https://the-three-devsketeers.atlassian.net/browse/SIAA-16) / [SIAA-47](https://the-three-devsketeers.atlassian.net/browse/SIAA-47) (New Product Registration)  
**Related Features**: [SIAA-39](https://the-three-devsketeers.atlassian.net/browse/SIAA-39) (Global Markup Rules Configuration), [SIAA-42](https://the-three-devsketeers.atlassian.net/browse/SIAA-42) (System Security Activity Logging)  

---

## Executive Summary & Business Intent

In a fast-moving motorcycle parts and service workshop, inventory administrators and workshop managers frequently encounter discrepancies in product descriptions, supplier cost adjustments, brand re-labeling, new compatible motorcycle models, warehouse shelf relocations, and image or specification updates. Previously, correcting an error in a registered product required either direct database intervention or cumbersome re-creation, risking broken foreign keys, detached historical sales transactions, and inaccurate stock adjustment logs.

The goal of this feature is to empower administrators with the ability to edit existing product specifications directly from the `/admin/inventory` catalog table via a dedicated "Edit Product Details" modal. This modal strictly enforces domain invariants: immutable SKU keys, protection of current on-hand stock quantities from accidental modification, automated recalculation of wholesale pricing based on global markup rate rules, strict input validation (preventing negative prices or empty required fields), and strict Role-Based Access Control (RBAC) ensuring non-admin roles (mechanics, cashiers) cannot edit catalog entries.

---

## Clarifications

### Session 2026-10-27
- Q: How should wholesale price be handled when unit cost or OEM status is updated? → A: Wholesale price is automatically recomputed via global markup rules from `/admin/rates` based on unit cost and OEM status, ensuring catalog consistency without manual override clutter.
- Q: Can stock quantities be directly adjusted inside the Edit Product Details modal? → A: No. Stock on-hand is displayed as an informational badge only. Stock quantities must strictly be altered via the dedicated Stock Adjustment modal to preserve forensic audit trails.
- Q: How should motorcycle model compatibility be handled in the form? → A: The form provides a quick-select dropdown populated with common fleet models (Yamaha NMAX 155, Aerox 155, Honda Click 125i/150i, ADV 160, Raider 150 Fi, Universal Fitment) alongside free-text custom fitment input.
- Q: What feedback is shown when saving product modifications? → A: An immediate optimistic update in `InventoryStore`, followed by a persistent toast banner ("Product '[Name]' ([SKU]) updated successfully!") and automatic modal closure upon server confirmation.

---

## User Stories & Acceptance Scenarios *(mandatory)*

### User Story 1 - Opening Edit Modal from Catalog Table (Priority: P1)

* **As an** Inventory Administrator / Workshop Manager,  
* **I want to** click an "Edit" action button on any existing product row in the inventory catalog table,  
* **so that** I can view a modal pre-populated with the product's current metadata and pricing without losing context.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Admin opens edit modal from catalog table
  Given I am authenticated as an administrator on the "/admin/inventory" page
  When I locate an existing product in the catalog table
  And I click the "Edit" action button on the product row
  Then an "Edit Product Details" modal opens with the title "Edit Product Details: [SKU]"
  And the form inputs are pre-populated with the product's existing values:
    | field                 | value source              | input type          |
    | Part Name             | product.name              | text input          |
    | Category              | product.category          | select dropdown     |
    | Brand                 | product.brand             | text input          |
    | Model Compatibility   | product.model             | text / model select |
    | Unit Cost             | product.cost              | numeric (PHP)       |
    | Retail Price          | product.retail            | numeric (PHP)       |
    | Shelf Locator         | product.location          | text input (rack/bin)|
    | OEM / Aftermarket     | product.oem               | radio / pill selector|
    | Description           | product.description       | multiline textarea  |
    | Image URL             | product.imageUrl          | text / URL input    |
  And the SKU field is rendered disabled/read-only with an explanation badge
  And the current stock quantity is not directly editable (with a hint to use "Adjust Stock")
  And Wholesale price is excluded from manual editing (calculated via markup rules)
  And Minimum stock alert threshold is excluded from manual editing
```

---

### User Story 2 - Saving Updated Product Details Successfully (Priority: P1)

* **As an** Inventory Administrator,  
* **I want to** modify allowed product fields (e.g., retail price, shelf location, or compatible motorcycle models) and click "Save Changes",  
* **so that** the updates are persisted to the database, reflected in real-time on the table, and confirmed with a toast notice.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Admin saves updated product details successfully
  Given the "Edit Product Details" modal is open for a selected product
  When I modify one or more editable fields:
    | field                 | modified value           |
    | Part Name             | "NMAX High Performance Brake Pad" |
    | Retail Price          | 450.00                   |
    | Shelf Locator         | "RACK-B-04"              |
    | Model Compatibility   | "Yamaha NMAX 155 / Aerox 155" |
  And I click "Save Changes"
  Then the submit button enters a loading state with spinner
  And the changes are dispatched to the server action "updateProductAction"
  And the database record is updated in PostgreSQL (Supabase with Prisma fallback)
  And the modal closes automatically upon success
  And a success toast notification appears: "Product '[name]' ([SKU]) updated successfully!"
  And the inventory catalog table and summary stats immediately reflect the updated details
  And an administrative audit log entry is recorded with action "Updated inventory product SKU: [SKU]"
```

---

### User Story 3 - Preserving Immutable Keys and Restricted Fields (Priority: P1)

* **As a** System Architect / Store Owner,  
* **I want** product SKU, stock quantity, and threshold rules to be protected against direct manual alteration in the edit modal,  
* **so that** inventory shrinkage audit trails, transaction foreign keys, and system-wide markup rules remain uncompromised.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Immutable and restricted fields preserved
  Given the "Edit Product Details" modal is open for a selected product
  When inspecting the modal fields
  Then the SKU input is strictly read-only (`disabled` / `readonly`), styled with a lock icon
  And current stock count is displayed for reference only without an edit input
  And the wholesale price is automatically recomputed when cost or OEM status changes according to active `/admin/rates` markup rules (unless a custom override was previously set)
  And attempting to bypass client validation by posting an altered SKU to "updateProductAction" is rejected with an immutable key constraint error
```

---

### User Story 4 - Form Validation on Price and Required Fields (Priority: P2)

* **As an** Inventory Administrator,  
* **I want to** receive immediate inline validation feedback if I enter invalid or empty data,  
* **so that** corrupted or nonsensical product records cannot be saved to the catalog.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Validation errors displayed on invalid form inputs
  Given the "Edit Product Details" modal is open
  When I clear the product name or brand
  Or I input a negative or zero unit cost (e.g., -50 or 0)
  Or I input a retail price less than or equal to zero
  And I click "Save Changes"
  Then submission is blocked
  And clear red error messages appear below each offending field:
    | field                 | trigger                  | error message                         |
    | name                  | empty or whitespace      | "Product name is required."           |
    | brand                 | empty or whitespace      | "Brand is required."                  |
    | cost                  | <= 0 or NaN              | "Unit cost must be greater than ₱0.00." |
    | retail                | <= 0 or NaN              | "Retail price must be greater than ₱0.00." |
  And the modal remains open with user modifications preserved
```

---

### User Story 5 - Non-Admin Role Restriction (RBAC) (Priority: P1)

* **As a** Security Compliance Officer,  
* **I want** non-admin staff roles (mechanics, cashiers, general staff) to be restricted from editing catalog records,  
* **so that** only authorized managerial staff can modify retail prices and product metadata.

#### Acceptance Criteria (Gherkin):
```gherkin
Scenario: Non-admin role restriction (RBAC)
  Given a user is authenticated with a non-admin role (e.g., mechanic, cashier)
  When viewing the inventory catalog or components
  Then the "Edit" action button is hidden or disabled for non-admin accounts
  And if an unauthorized user attempts to invoke the "updateProductAction" server action directly
  Then the action rejects the request with code "UNAUTHORIZED" and error message "Administrative privileges required to edit product details."
```

---

## Success Criteria

1. **Catalog Integrity**: 100% of product detail updates persist accurately to Supabase/Prisma without altering the SKU or resetting stock counts.
2. **Speed & Responsiveness**: Submitting product updates completes and updates UI state within <500ms under standard network conditions.
3. **Audit Trail**: Every successful product edit records an administrative audit log with the acting supervisor's identity.
4. **Token Fidelity**: Zero hardcoded hex or RGB colors; full adherence to SWIFT semantic tokens and Tailwind CSS v4 guidelines.
5. **Quality & Test Coverage**: 100% pass rate on unit tests covering validation, markup calculation, server action execution, and store reactivity.
