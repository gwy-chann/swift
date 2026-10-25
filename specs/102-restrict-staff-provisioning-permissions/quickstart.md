# Quickstart Verification Guide: Restrict Staff Provisioning Permissions

**Feature**: `102-restrict-staff-provisioning-permissions`  
**Ticket**: [SIAA-102](https://the-three-devsketeers.atlassian.net/browse/SIAA-102)  

This guide provides test verification scenarios for the restricted staff provisioning workflow.

---

## Prerequisites

1. Ensure the application is running:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/admin/users`.
3. Ensure you are signed in or operating in Admin mode.

---

## Scenario 1: Provisioning Staff with "Cashier Privilege"

1. On `/admin/users`, click the **"Add Staff Member"** button in the header.
2. In the modal, verify the fields:
   - Full Name: `Test Cashier`
   - Store Email Address: `test.cashier@swift.local`
3. Inspect the Operational Role dropdown:
   - Select **"Cashier Privilege"**.
4. Confirm that **NO custom permission checkboxes** appear in the modal.
5. Click **"Create Staff Account"**.
6. **Expected Result**:
   - Modal closes cleanly.
   - The new user appears in the User Ledger Table with role `Cashier`.
   - The user has default permissions (all flags `false`).
   - A security audit entry is created.

---

## Scenario 2: Provisioning Staff with "Mechanic" and "Inventory Clerk"

1. Open **"Add Staff Member"** modal.
2. Enter Name `Test Mechanic`, Email `test.mechanic@swift.local`.
3. Select **"Mechanic"**. Click Save.
   - User appears with role `Mechanic` and default mechanic permissions.
4. Open **"Add Staff Member"** modal.
5. Enter Name `Test Inventory Clerk`, Email `test.clerk@swift.local`.
6. Select **"Inventory Clerk"**. Click Save.
   - User appears with role `Inventory Clerk` and `can_adjust_stock: true`.

---

## Scenario 3: Prevention of Arbitrary or Superfluous Options (DOM Inspection)

1. Open **"Add Staff Member"** modal.
2. Inspect the `<select id="staff-role">` element.
3. Verify that **exactly three** `<option>` elements exist:
   - `Cashier Privilege` (`cashier`)
   - `Mechanic` (`mechanic`)
   - `Inventory Clerk` (`inventory_clerk`)
4. Verify that `Admin` and `Staff` options are NOT present.
5. Verify that `input[type="checkbox"]` does NOT exist in the modal.

---

## Scenario 4: Automated Test Execution

Run the unit tests:

```bash
npm test lib/admin/__tests__/restricted-staff-provisioning.test.ts
npm test lib/admin/__tests__/user-actions.test.ts
```

All test assertions must pass.
