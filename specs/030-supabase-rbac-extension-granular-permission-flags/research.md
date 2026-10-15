# Research & Technical Decisions: Supabase RBAC Extension & Admin Provisioning Actions

**Feature**: Supabase RBAC Extension, Granular Permission Flags Schema & Admin Provisioning Actions  
**Feature Directory**: `specs/030-supabase-rbac-extension-granular-permission-flags`  
**Date**: 2026-10-15  
**Status**: Completed  

---

## Technical Context & Decisions

### 1. Extending `public.user_role` Enum in PostgreSQL

- **Decision**: Execute `ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'inventory_clerk';` in migration `20261019000000_rbac_permissions.sql`.
- **Rationale**:
  - PostgreSQL 12+ supports `ALTER TYPE ... ADD VALUE IF NOT EXISTS` natively within transactions or standalone statements.
  - Formally identifies warehouse and stock inventory personnel in domain layers without conflating them with general `staff` or `cashier` personas.
  - Aligns with the 5 operational tiers defined in SWIFT documentation and `../mockup/app.js`: `Admin`, `Cashier`, `Mechanic`, `Staff`, `Inventory Clerk`.
- **Alternatives Considered**:
  - *Generic `staff` role with role tags*: Loses enum-level type safety and allows arbitrary string role injection.
  - *Separate `roles` lookup table with many-to-many user mappings*: Unnecessary complexity for SWIFT's fixed 5-role system.

---

### 2. Granular Permission Flags Architecture (`public.profiles.permissions`)

- **Decision**: Add a `permissions JSONB NOT NULL` column with default value `'{"can_adjust_stock": false, "can_override_discount": false, "can_manage_pricing": false, "can_view_reports": false}'::jsonb`.
- **Rationale**:
  - Allows fine-grained operational control without adding 4+ boolean columns or a complex ACL table.
  - Enables future extension with additional permission flags (e.g., `can_refund_transaction`, `can_export_csv`) without requiring schema migrations.
  - Can be queried, indexed with GIN if necessary (`idx_profiles_permissions`), and checked via jsonb containment operators (`@>`).
  - Serializes directly into TypeScript interfaces (`StaffPermissions`) and Zod schemas (`StaffPermissionsSchema`).
- **Default Permissions by Role**:
  - `admin`: All flags `true`.
  - `inventory_clerk`: `can_adjust_stock: true`, others `false`.
  - `cashier`: `can_override_discount: false` (requires elevation), others `false`.
  - `mechanic`: All flags `false`.
  - `staff`: Configurable per staff member.

---

### 3. Self-Lockout Prevention in RLS & Database Triggers

- **Decision**: Implement a Postgres trigger function `public.enforce_admin_self_protection()` on `public.profiles` executing `BEFORE UPDATE` or `BEFORE DELETE`.
- **Rationale**:
  - If the updating session (`auth.uid()`) is an administrator targeting their own profile row (`OLD.id = auth.uid()`), the trigger blocks updates that attempt to change `role != 'admin'` or `status != 'Active'`.
  - Also prevents deletion of the primary admin user.
  - Guarantees database-level invariant protection even if an administrator mistakenly calls an API endpoint or sends a malformed payload.
- **Alternatives Considered**:
  - *Application-only validation guard*: Vulnerable to bypass if profile rows are updated via PostgREST or Supabase client directly.
  - *Fixed hardcoded ID check*: Fragile if multiple admins exist across test and production environments.

---

### 4. Admin User Provisioning Service Action Pattern

- **Decision**:
  - Use `createAdminClient()` (leveraging `SUPABASE_SERVICE_ROLE_KEY`) inside `provisionStaffUserAction()`.
  - Use Supabase Auth Admin API: `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, role, permissions } })`.
  - In environments without active Supabase connectivity or during automated tests, gracefully fallback to in-memory user registry (`lib/mock-data/users.ts`).
  - Trigger cache revalidation on `/admin/users` via `revalidatePath('/admin/users')`.
- **Rationale**:
  - Front-end client cannot create other users with pre-confirmed email without service-role credentials.
  - Service-role privileges must remain strictly confined to Server Actions behind session role verification (`session.role === 'Admin'`).
  - The fallback pattern ensures standard unit tests and mock demos function without requiring a live remote Supabase instance.

---

### 5. Alignment with SWIFT Design Tokens & Admin Layout Shell

- **Decision**:
  - UI layout on `app/admin/users/page.tsx` strictly mirrors the Admin Portal design pattern established in `components/admin/admin-layout-shell.tsx`, `components/admin/rates/labor-rates-table.tsx`, and `../mockup/admin.html`.
  - Interactive table features:
    - User avatar initial circle with `bg-primary-light text-primary`
    - Role badge pills (`bg-primary-light text-primary` for Admin, `bg-info-light text-info` for Inventory Clerk, `bg-secondary text-text-secondary` for Cashier/Mechanic)
    - Permission chips with check/cross indicators
    - Action buttons with `hover:bg-bg-hover`
    - Modal dialog `AddStaffModal` with `bg-bg-card border-border shadow-2xl`
  - Zero hardcoded colors: 100% adherence to `app/globals.css` and `lib/tokens.ts`.
