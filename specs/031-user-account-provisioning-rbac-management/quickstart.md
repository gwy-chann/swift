# Quickstart & Verification Guide: User Account Provisioning & RBAC Management

**Feature**: SIAA-38 (STORY-7.1)  
**Spec Directory**: `specs/031-user-account-provisioning-rbac-management/`

---

## 1. Overview

This walkthrough guides validation of the administrative User Account Provisioning and RBAC Management interface, covering the ledger view, employee provisioning modal, edit modal with granular permissions, self-lockout guards, and audit trail verification.

---

## 2. Test Execution Scenarios

### Scenario 1: Ledger Table Rendering (`#view-users`)
1. Log in as an Administrator and navigate to `/admin/users`.
2. Verify the outer container has `id="view-users"`.
3. Inspect the employee table body (`id="usersTableBody"`).
4. Verify each row contains:
   - Full Name & initials
   - Email address
   - Semantic role badge (e.g. Admin, Cashier, Mechanic, Inventory Clerk)
   - Status pill (Active / Inactive)
   - Granular permission chips (Stock In, Discount Override, Manage Pricing, Audit Reports)
   - An "Edit" button (`data-testid="btn-edit-user-${id}"`) and "Toggle Status" button.

### Scenario 2: New Staff Account Creation & Audit Event
1. Click the "+ Add Staff User" button (`id="btnAddStaffUser"`).
2. Enter:
   - Full Name: `Roberto Gomez`
   - Email: `roberto.gomez@swift.ph`
   - Temporary PIN: `Swift123!`
   - Role: `Cashier`
   - Permissions: Check `Discount Override`
3. Click "Provision Employee".
4. Verify that:
   - The modal closes without error.
   - The new account immediately appears at the top of `#usersTableBody`.
   - A security audit event is recorded (`Created employee account for roberto.gomez@swift.ph (cashier)`).

### Scenario 3: Granular Permission Flag Modification & Edit Staff Modal
1. On `Roberto Gomez`'s row, click the "Edit" button.
2. Confirm the Edit Staff Modal displays pre-populated values.
3. Toggle `Stock In` to ENABLED and change role to `Inventory Clerk`.
4. Click "Save Changes".
5. Verify:
   - The modal closes.
   - The role badge updates to `Inventory Clerk`.
   - The permission chips immediately include `Stock In`.
   - A security audit event is recorded.

### Scenario 4: Duplicate Email & Self-Lockout Prevention
1. Open "+ Add Staff User" and enter an existing email (e.g., `carlos.rodriguez@swift.ph`).
2. Submit the form.
3. Verify rejection with: `"An account with this email address already exists"`.
4. On the current logged-in Admin row (`Carlos Rodriguez`), attempt to deactivate the account or demote the role to Cashier.
5. Verify rejection with: `"Admin self-lockout or deactivation is prohibited."`

---

## 3. Automated Test Suite Execution

Run the automated Vitest test suite to verify all business rules, contracts, and self-lockout protections:

```bash
npm test lib/admin/__tests__/user-actions.test.ts
```
