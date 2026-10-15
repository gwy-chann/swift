# Data Model & Storage Architecture: Supabase RBAC Extension & Granular Permissions

**Feature**: Supabase RBAC Extension, Granular Permission Flags Schema & Admin Provisioning Actions  
**Feature Directory**: `specs/030-supabase-rbac-extension-granular-permission-flags`  
**Date**: 2026-10-15  

---

## 1. PostgreSQL Schema & Database Entities

### 1.1 Type: `public.user_role` (Updated)

```sql
-- Alter existing enum to add inventory_clerk
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'inventory_clerk';
COMMENT ON TYPE public.user_role IS 'SWIFT operational user access tiers: admin, staff, cashier, mechanic, inventory_clerk';
```

### 1.2 Table: `public.profiles` (Altered)

```sql
-- Add permissions JSONB column with standard defaults
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL 
DEFAULT '{"can_adjust_stock": false, "can_override_discount": false, "can_manage_pricing": false, "can_view_reports": false}'::jsonb;

-- Fast index for JSONB queries if needed
CREATE INDEX IF NOT EXISTS idx_profiles_permissions ON public.profiles USING GIN (permissions);
```

### 1.3 Trigger: Self-Lockout & Demotion Guard

```sql
CREATE OR REPLACE FUNCTION public.enforce_admin_self_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If the executing user is modifying their own profile
    IF OLD.id = (SELECT auth.uid()) AND OLD.role = 'admin'::public.user_role THEN
        -- Prevent demoting self from admin
        IF NEW.role != 'admin'::public.user_role THEN
            RAISE EXCEPTION 'Admin self-demotion is prohibited to prevent system lockout.'
                USING ERRCODE = '23514';
        END IF;

        -- Prevent deactivating or suspending self
        IF NEW.status != 'Active' THEN
            RAISE EXCEPTION 'Admin self-deactivation is prohibited.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_self_protection ON public.profiles;
CREATE TRIGGER trg_admin_self_protection
    BEFORE UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_admin_self_protection();
```

---

## 2. Prisma ORM Schema (`prisma/schema.prisma`)

```prisma
enum UserRole {
  admin
  staff
  cashier
  mechanic
  inventory_clerk

  @@map("user_role")
}

model Profile {
  id          String   @id @db.Uuid
  email       String   @unique
  fullName    String?  @map("full_name")
  role        UserRole @default(staff)
  permissions Json     @default("{\"can_adjust_stock\": false, \"can_override_discount\": false, \"can_manage_pricing\": false, \"can_view_reports\": false}")
  status      String   @default("Active")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("profiles")
}
```

---

## 3. TypeScript Domain Models & Contracts

### 3.1 Permissions Interface

```typescript
export interface StaffPermissions {
  can_adjust_stock: boolean;
  can_override_discount: boolean;
  can_manage_pricing: boolean;
  can_view_reports: boolean;
}

export const DEFAULT_STAFF_PERMISSIONS: Readonly<StaffPermissions> = {
  can_adjust_stock: false,
  can_override_discount: false,
  can_manage_pricing: false,
  can_view_reports: false,
};

export const DEFAULT_ROLE_PERMISSIONS: Record<DbUserRole, StaffPermissions> = {
  admin: {
    can_adjust_stock: true,
    can_override_discount: true,
    can_manage_pricing: true,
    can_view_reports: true,
  },
  inventory_clerk: {
    can_adjust_stock: true,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
  cashier: {
    can_adjust_stock: false,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
  mechanic: {
    can_adjust_stock: false,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
  staff: {
    can_adjust_stock: false,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
};
```

### 3.2 Staff User Record

```typescript
export interface StaffUserRecord {
  id: string;
  email: string;
  fullName: string;
  role: DbUserRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  permissions: StaffPermissions;
  createdAt: string;
  updatedAt: string;
}
```
