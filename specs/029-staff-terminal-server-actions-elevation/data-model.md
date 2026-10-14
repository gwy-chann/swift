# Data Model: Staff Terminal Server Actions, Secure Elevation Auth & UI Wiring

**Feature**: `029-staff-terminal-server-actions-elevation`  
**Jira Ticket**: [SIAA-64](https://the-three-devsketeers.atlassian.net/browse/SIAA-64)  
**Date**: 2026-10-14  

---

## 1. Domain Entities & Interfaces

### Staff Shift Action Results

```typescript
export interface ShiftActionResult {
  success: boolean;
  shiftId?: string;
  staffName?: string;
  terminalId?: string;
  clockIn?: string;
  clockOut?: string;
  durationFormatted?: string;
  status?: 'on_shift' | 'break' | 'completed';
  error?: string;
  code?: string;
}

export interface AttendanceHistoryResult {
  success: boolean;
  logs: PunchLog[];
  activeShift: DbStaffShift | null;
  error?: string;
}
```

### Instant SKU Price Check DTO

```typescript
export interface ProductPriceCheckResult {
  success: boolean;
  product?: {
    id: string;
    sku: string;
    name: string;
    category: string;
    brand: string;
    model: string;
    stock: number;
    minThreshold: number;
    location: string;
    retailPrice: number;
    wholesalePrice: number;
    scPwdPrice: number; // Retail * 0.80
  };
  error?: string;
  code?: 'PRODUCT_NOT_FOUND' | 'INVALID_QUERY' | 'DATABASE_ERROR';
}
```

### Admin Elevation Types

```typescript
export interface AdminElevationResult {
  success: boolean;
  elevatedUntil?: number; // epoch ms
  error?: string;
  code?: 'INVALID_PIN' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'SERVER_ERROR';
}
```

---

## 2. Cookie & Session Schema

| Cookie Name | Value Format | Options | Purpose |
|---|---|---|---|
| `swift_admin_elevated` | `'true'` or cryptographic token | `HttpOnly; Path=/; SameSite=Lax; Max-Age=3600` | Authorizes access to `/admin` routes from elevated staff terminal session |

---

## 3. State Machines & Transitions

### Punch Clock Flow:
`Idle` ➔ `clockInShiftAction()` ➔ `on_shift` (Active Shift Timer running)  
`on_shift` ➔ `toggleShiftBreakAction()` ➔ `break` (Timer paused)  
`break` ➔ `toggleShiftBreakAction()` ➔ `on_shift` (Timer resumed)  
`on_shift` | `break` ➔ `clockOutShiftAction()` ➔ `completed` (Timer stopped, history updated)
