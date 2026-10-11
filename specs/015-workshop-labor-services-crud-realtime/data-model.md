# Data Model: Supabase Workshop Labor Services Admin CRUD & Realtime Sync

**Feature**: `015-workshop-labor-services-crud-realtime`  
**Jira Issue**: [SIAA-59](https://the-three-devsketeers.atlassian.net/browse/SIAA-59)  
**Date**: 2026-10-11  

---

## 1. Relational Entities (PostgreSQL / Supabase)

### 1.1 `public.labor_services`
Authoritative master catalog for motorcycle workshop labor services.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique immutable ID |
| `code` | TEXT | NOT NULL UNIQUE | Standard service code (e.g., `SRV-CVT-01`) |
| `name` | TEXT | NOT NULL | Service display title |
| `bay` | TEXT | NOT NULL | Workshop repair bay assignment |
| `rate` | NUMERIC(10, 2) | NOT NULL, CHECK (`rate >= 0`) | Flat service charge in PHP (₱) |
| `duration` | TEXT | NOT NULL | Estimated completion duration (e.g. `45 mins`) |
| `description` | TEXT | NULL | Detailed service scope |
| `active` | BOOLEAN | NOT NULL DEFAULT `true` | Soft-deletion / POS visibility flag |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT `now()` | Auto-updated via trigger |

### 1.2 `public.service_rate_audit_logs`
Immutable audit ledger recording every labor service rate modification.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Audit log entry ID |
| `service_id` | UUID | NOT NULL REFERENCES `labor_services(id)` ON DELETE CASCADE | Associated labor service |
| `service_code` | TEXT | NOT NULL | Snapshot of service code |
| `old_rate` | NUMERIC(10, 2) | NOT NULL | Rate before mutation |
| `new_rate` | NUMERIC(10, 2) | NOT NULL | Rate after mutation |
| `reason` | TEXT | DEFAULT `''` | Administrative reason for update |
| `user_name` | TEXT | DEFAULT `'Admin Manager'` | Attribution of who made change |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT `now()` | Immutable timestamp of adjustment |

---

## 2. TypeScript Domain Models & DTOs

### 2.1 `LaborService` Domain Model
```typescript
export interface LaborService {
  id?: string;
  code: string;
  name: string;
  bay: string;
  rate: number;
  duration: string;
  description?: string;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
```

### 2.2 `ServiceRateAuditLog` Model
```typescript
export interface ServiceRateAuditLog {
  id: string;
  serviceId: string;
  serviceCode: string;
  oldRate: number;
  newRate: number;
  reason?: string;
  userName: string;
  createdAt: string;
}
```

### 2.3 Server Action Input & Result DTOs
```typescript
export interface CreateLaborServicePayload {
  code: string;
  name: string;
  bay: string;
  rate: number;
  duration: string;
  description?: string;
  active?: boolean;
}

export interface UpdateLaborServicePayload {
  name?: string;
  bay?: string;
  rate?: number;
  duration?: string;
  description?: string;
  active?: boolean;
  reason?: string;
  userName?: string;
}

export interface ServiceActionResult<T = LaborService> {
  success: boolean;
  data?: T;
  error?: string;
  code?: 'NOT_FOUND' | 'DUPLICATE_CODE' | 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'DATABASE_ERROR';
}
```

---

## 3. Realtime Payload Mapping

When PostgreSQL emits a change event on `labor_services`:

```typescript
export interface RealtimeLaborServicePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}
```

Mapping function converts raw numeric strings and snake_case properties to strongly-typed camelCase domain objects.
