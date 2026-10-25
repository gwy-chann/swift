# Technical Research & Architecture Decisions: Staff Credential Provisioning & Reset (SIAA-104)

**Feature**: Admin: Provision email, password, and PIN for staff with credential reset capability  
**Ticket**: [SIAA-104](https://the-three-devsketeers.atlassian.net/browse/SIAA-104)  
**Date**: 2026-10-26  

---

## 1. Problem Context & Existing Architecture

### Existing Provisioning Workflow
- `provisionStaffUserAction` in `lib/admin/user-actions.ts` currently accepts `fullName`, `email`, and `role`.
- If no password was provided, it defaulted to a randomized string (`SwiftTemp#<rand>`).
- It did not accept an explicit `pin` from the UI; the `AddStaffModal` lacked fields for password and PIN.
- The `pin_code` column in `public.profiles` was added by migration `20261021000000_staff_kiosk_auth_rpcs.sql` (`VARCHAR(10)`), with default `'1234'`.
- In-memory fallback (`MOCK_STAFF_PROFILES`) in `lib/mock-data/users.ts` did not track explicit PIN per user or allow runtime updates to credentials.

### Existing Deficiencies
1. **No Admin Credential Reset UI**: If an employee forgot their password or PIN, the administrator had no button or modal in `/admin/users` to issue replacement credentials.
2. **Missing Input Fields in Add Staff Modal**: The modal only had Name, Email, and Role.
3. **No PIN Formatting Enforcement in Admin Forms**: The UI and contracts did not validate that PINs are strictly 4 to 6 numeric digits with the exact prompt message required by acceptance criteria.

---

## 2. Architecture Decisions & Technical Approaches

### Decision 1: Credential Triad Management in Next.js Server Actions
- **Action**: Add `resetStaffCredentialsAction(rawPayload, callerRoleOverride, callerIdOverride)` to `lib/admin/user-actions.ts`.
- **Payload Contract**:
  ```typescript
  export const ResetStaffCredentialsSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    password: z.string().min(6, 'Password must be at least 6 characters in length'),
    pin: z
      .string()
      .regex(/^\d{4,6}$/, 'PIN must consist of 4 to 6 numeric digits.'),
  });
  ```
- **Execution Flow**:
  1. Authorize caller is `admin`.
  2. Validate payload via `ResetStaffCredentialsSchema`.
  3. Update auth user password via `supabaseAdmin.auth.admin.updateUserById(userId, { password })`.
  4. Update `public.profiles` row `pin_code = pin`.
  5. If offline / test environment: update in-memory user (`memoryStaffUsers` with `pinCode`).
  6. Log security audit event: `"Reset credentials for employee account: <email>"` with `severity: 'warning'`.
  7. Revalidate `/admin/users` path.

### Decision 2: AddStaffModal Credential Integration
- Update `ProvisionStaffUserSchema` in contracts to accept optional/mandatory `password` and `pin`:
  ```typescript
  export const ProvisionStaffCredentialsSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    role: z.enum(['cashier', 'mechanic', 'inventory_clerk'], {
      errorMap: () => ({
        message: 'Staff account role must be strictly one of: Cashier Privilege (cashier), Mechanic (mechanic), or Inventory Clerk (inventory_clerk).',
      }),
    }),
    password: z.string().min(6, 'Temporary password must be at least 6 characters in length'),
    pin: z
      .string()
      .regex(/^\d{4,6}$/, 'PIN must consist of 4 to 6 numeric digits.'),
  });
  ```
- Update `AddStaffModal` UI:
  - Add `Temporary Password` input field (`id="staff-password"`, `type="password"`, with toggle visibility or clean placeholder).
  - Add `Numeric PIN` input field (`id="staff-pin"`, `type="password"`, `maxLength={6}`, placeholder="4 to 6 numeric digits").
  - Client-side pre-validation showing `"PIN must consist of 4 to 6 numeric digits."` upon invalid input.

### Decision 3: Reset Credentials Action & Modal UI
- Add "Reset Credentials" action button in `UserLedgerTable`:
  - Icon: Key / ShieldAlert (`lucide-react`)
  - Attributes: `id={`btnResetCredentials-${user.id}`}`, `data-testid={`btn-reset-credentials-${user.id}`}`, `title="Reset Credentials"`, `aria-label={`Reset credentials for ${user.fullName}`}`.
- Create `components/admin/users/reset-credentials-modal.tsx`:
  - Displays user's name, email, and role badge.
  - Inputs: New Password (`id="reset-password"`), New Numeric PIN (`id="reset-pin"`, 4 to 6 numeric digits).
  - Validation: Displays `"PIN must consist of 4 to 6 numeric digits."` if PIN is non-numeric or length `< 4` or `> 6`.
  - Submits to `resetStaffCredentialsAction`.
  - On success, updates local state and closes modal with notification toast.

### Decision 4: Backend Parity (Spring Boot)
- Endpoint: `POST /api/v1/admin/users/{id}/reset-credentials`
- Request DTO: `ResetCredentialsRequest(String password, String pin)`
  - `@NotBlank`
  - `@Size(min = 6)` for password
  - `@Pattern(regexp = "^\\d{4,6}$", message = "PIN must consist of 4 to 6 numeric digits.")`
- Service method: `UserAdminService.resetCredentials(UUID id, ResetCredentialsRequest request, UUID callerUserId, String callerEmail)`
- Security audit log recorded.

---

## 3. Risk & Mitigation Matrix

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Admin accidentally enters 3-digit PIN | Staff cannot log in at terminal | Strict regex `/^\d{4,6}$/` with mandatory test cases and matching error message. |
| Supabase Auth admin API unavailable in test | Unit test failure | Graceful fallback to `memoryStaffUsers` with `pinCode` field update in tests. |
| Non-admin caller invokes reset action | Privilege escalation | Strict caller context check `callerRole === 'admin'`; returns `UNAUTHORIZED`. |
| Audit trail omitted | Compliance failure | Guaranteed call to `logSecurityEventAction` with target email and metadata. |
