# Quickstart Verification Guide: Staff Credential Provisioning & Reset (SIAA-104)

**Feature**: Admin: Provision email, password, and PIN for staff with credential reset capability  
**Ticket**: [SIAA-104](https://the-three-devsketeers.atlassian.net/browse/SIAA-104)  
**Date**: 2026-10-26  

---

## 1. Quick Local Verification (Next.js)

### Scenario A: Provision New Staff Member with Credentials
1. Navigate to `http://localhost:3000/admin/users`.
2. Click **"Add Staff Member"** button in the header.
3. In the modal:
   - Full Name: `Test Mechanic`
   - Store Email: `mechanic.test@swift.local`
   - Role: `Mechanic`
   - Temporary Password: `password123`
   - Numeric PIN: `1234`
4. Click **"Provision Account"**.
5. Verify:
   - Account `mechanic.test@swift.local` appears in the ledger table.
   - Credentials and PIN are persisted.

### Scenario B: PIN Validation Testing
1. In the **"Add Staff Member"** or **"Reset Credentials"** modal:
   - Enter `abcd` in the PIN field -> Error displays: *"PIN must consist of 4 to 6 numeric digits."*
   - Enter `123` (3 digits) -> Error displays: *"PIN must consist of 4 to 6 numeric digits."*
   - Enter `1234567` (7 digits) -> Error displays: *"PIN must consist of 4 to 6 numeric digits."*
   - Enter `5555` (4 digits) -> Valid, error clears.
   - Enter `987654` (6 digits) -> Valid, error clears.

### Scenario C: Reset Staff Credentials
1. In the User Ledger table, find any staff row (e.g. `cashier@swift.local`).
2. Click the **"Reset Credentials"** key icon (`data-testid="btn-reset-credentials-<id>"`).
3. The **"Reset Staff Credentials"** modal opens displaying employee details.
4. Input:
   - New Password: `newpassword123`
   - New Numeric PIN: `9999`
5. Click **"Update Credentials"**.
6. Verify success confirmation toast and updated credentials in store.

---

## 2. Automated Test Execution

### Next.js Unit Tests
```bash
npx vitest run lib/admin/__tests__/user-actions.test.ts
```

### Spring Boot Backend Tests
```bash
./mvnw test -Dtest=UserAdminControllerTests
```
