# Quickstart & Verification Guide: Supabase RBAC Extension & Admin Provisioning Actions

**Feature**: Supabase RBAC Extension, Granular Permission Flags Schema & Admin Provisioning Actions  
**Feature Directory**: `specs/030-supabase-rbac-extension-granular-permission-flags`  
**Jira Issue**: [SIAA-56](https://the-three-devsketeers.atlassian.net/browse/SIAA-56)  

---

## 1. Quick Verification Steps

### Step 1: Run Automated Verification Tests
Execute the unit and integration test suite covering the RBAC schemas, server actions, and self-lockout guards:

```bash
npm test -- "lib/admin/__tests__/user-actions.test.ts"
```

### Step 2: Validate Prisma Schema Synchronization
Ensure the Prisma ORM schema is synchronized with the new `inventory_clerk` enum value and `permissions` column:

```bash
npx prisma validate
```

### Step 3: Run Full Codebase Static Analysis
Verify that TypeScript compilation and lint checks pass without errors:

```bash
npx tsc --noEmit
npm run lint
```

---

## 2. Interactive Verification Scenarios

### Scenario A: Hydrating User Ledger at `/admin/users`
1. Start the development server (`npm run dev`) or test server components.
2. Sign in as Admin (`admin@swift.local`) or switch role to Admin.
3. Navigate to `/admin/users`.
4. **Verification**:
   - The user ledger renders an interactive table listing all staff members (`Carlos Rodriguez`, `Mike Morales`, `Dante Reyes`, `Rico Santos`).
   - Rico Santos displays with the `Inventory Clerk` badge and permission tag `Stock Adjustments`.
   - Each user shows email, status badge (`Active`), role pill, and permission chips.

### Scenario B: Provisioning a New Staff Member via Modal
1. On `/admin/users`, click the **"Add Employee"** / **"Add Staff"** button.
2. The modal dialog opens with fields: Full Name, Email, Role selector, and Permission checkboxes.
3. Enter:
   - Full Name: `Elena Vance`
   - Email: `elena@swift.local`
   - Role: `Inventory Clerk`
   - Check `can_adjust_stock` (auto-selected for inventory clerk).
4. Click **"Save Staff Account"**.
5. **Verification**:
   - The modal closes.
   - Elena Vance immediately appears in the user table with `Inventory Clerk` role and `Active` status.
   - Cache revalidation triggers cleanly.

### Scenario C: Self-Lockout Prevention
1. On `/admin/users`, locate the active Admin account (`Carlos Rodriguez` / current admin session).
2. Attempt to toggle status to `Inactive` or demote role to `Cashier`.
3. **Verification**:
   - The action is blocked with error message: `"Admin self-lockout or demotion is prohibited."`
   - The account remains an active `Admin`.

### Scenario D: Non-Admin Permission Escalation Rejection
1. Switch to a Cashier session (`cashier@swift.local`).
2. Attempt to invoke `provisionStaffUserAction` or `updateUserPermissionsAction`.
3. **Verification**:
   - Request returns `{ success: false, error: 'Unauthorized: Admin privileges required', code: 'UNAUTHORIZED' }`.
   - Route guard redirects cashier away from `/admin/users` to `/staff/pos`.
