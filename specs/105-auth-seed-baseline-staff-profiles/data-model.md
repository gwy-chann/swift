# Data Model: Baseline Staff Profiles & Credentials

**Feature Branch**: `feat/SIAA-105-auth-seed-baseline-staff-profiles`  
**Created**: 2026-10-26  
**Jira Ticket**: [SIAA-105](https://the-three-devsketeers.atlassian.net/browse/SIAA-105)

---

## 1. Relational Database Schema (PostgreSQL / Supabase)

### 1.1 `auth.users` Table
Stores authentication credentials, confirmation status, and encrypted password hashes.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Unique user identifier matching `public.profiles.id` |
| `instance_id` | `UUID` | NOT NULL | Default instance (`00000000-0000-0000-0000-000000000000`) |
| `aud` | `VARCHAR(255)` | NOT NULL | Audience token (`authenticated`) |
| `role` | `VARCHAR(255)` | NOT NULL | Authentication role (`authenticated`) |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Staff email address (e.g. `cashier@swift.local`) |
| `encrypted_password` | `VARCHAR(255)` | NOT NULL | Blowfish/Bcrypt hash generated via `crypt('swift123', gen_salt('bf'))` |
| `email_confirmed_at` | `TIMESTAMPTZ` | NOT NULL | Timestamp confirming active email status |
| `raw_app_meta_data` | `JSONB` | NOT NULL | App metadata: `{"provider": "email", "providers": ["email"]}` |
| `raw_user_meta_data` | `JSONB` | NOT NULL | User metadata: `{"full_name": "...", "role": "..."}` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Last update timestamp |

---

### 1.2 `auth.identities` Table
Enables GoTrue password authentication lookup by email.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY | Typically the user UUID string |
| `user_id` | `UUID` | REFERENCES `auth.users(id)` ON DELETE CASCADE | Associated user account |
| `identity_data` | `JSONB` | NOT NULL | JSON object with `sub` (UUID) and `email` |
| `provider` | `TEXT` | NOT NULL | Identity provider (`email`) |
| `provider_id` | `TEXT` | NOT NULL | Provider lookup key (same as user email) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Last update timestamp |

---

### 1.3 `public.profiles` Table
Application-level profile containing role assignments, display names, and numeric PIN codes.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, REFERENCES `auth.users(id)` | Profile UUID bound 1-to-1 with auth user |
| `email` | `TEXT` | UNIQUE, NOT NULL | Staff email address |
| `full_name` | `TEXT` | NOT NULL | Staff member display name |
| `role` | `public.user_role` | NOT NULL | Enum: `admin`, `cashier`, `mechanic`, `inventory_clerk`, `staff` |
| `status` | `TEXT` | NOT NULL, DEFAULT `'Active'` | Account status (`Active`, `Inactive`, `Suspended`) |
| `pin_code` | `VARCHAR(10)` | DEFAULT `'1234'` | Dedicated 4-digit PIN for shop floor terminal authorization |
| `permissions` | `JSONB` | DEFAULT NULL | Granular permission overrides |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Last update timestamp |

---

## 2. Baseline Seed Data Matrix

| Account / Person | Email | Role | Default Password | Dedicated PIN | Target Workstation / Route |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Carlos Rodriguez** | `admin@swift.local` | `admin` | `swift123` | `8888` | Executive / `/admin` |
| **Mike Morales** | `cashier@swift.local` | `cashier` | `swift123` | `1234` | Front-Counter POS / `/staff/pos` |
| **Dante Reyes** | `mechanic1@swift.local` | `mechanic` | `swift123` | `2222` | Service Bays / `/staff/compat` |
| **Rico Santos** | `warehouse@swift.local` | `inventory_clerk` | `swift123` | `3333` | Warehouse / `/staff/search` |

---

## 3. TypeScript Domain Models & DTOs

```typescript
export interface DemoAccount {
  id?: string;
  name?: string;
  label: string;
  email: string;
  role: PortalRole;          // 'admin' | 'staff'
  staffRole?: string;        // 'cashier' | 'mechanic' | 'inventory_clerk' | 'admin'
  targetUrl: string;
  buttonLabel: string;
  defaultPassword?: string;
  pin?: string;
}

export interface VerifyStaffPinResult {
  success: boolean;
  profile?: StaffKioskProfile;
  error?: string;
  code?: 'INVALID_PIN' | 'ACCOUNT_INACTIVE' | 'PROFILE_NOT_FOUND' | 'SYSTEM_ERROR';
}
```
