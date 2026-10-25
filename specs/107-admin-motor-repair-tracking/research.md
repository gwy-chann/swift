# Research & Technical Architecture: Admin Motor Repair Tracking Dashboard

**Feature**: `specs/107-admin-motor-repair-tracking`  
**Jira Key**: [SIAA-107](https://the-three-devsketeers.atlassian.net/browse/SIAA-107)  
**Date**: 2026-10-26  

---

## 1. Technical Stack & Architectural Constraints

- **Framework**: Next.js 15 (App Router with React 19 Server & Client Components).
- **Styling**: Tailwind CSS v4 strictly adhering to `.agents/rules/tailwind-v4.md` (canonical utilities, `bg-linear-to-*`, no arbitrary bracket colors, no hardcoded hex/rgb).
- **Design Tokens**: Standard SWIFT design tokens:
  - Surface backgrounds: `bg-bg-base`, `bg-bg-surface`, `bg-bg-sidebar`, `bg-bg-elevated`
  - Text colors: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-light`
  - Borders: `border-border-subtle`, `border-border-strong`
  - Accents: `bg-primary`, `text-primary`, `bg-success/10`, `text-success`, `bg-warning/10`, `text-warning`, `bg-danger/10`, `text-danger`, `bg-info/10`, `text-info`
- **Database & Storage**:
  - Primary tables: `public.work_orders`, `public.service_bays`, `public.profiles`, `public.audit_logs`.
  - Resilience: Resilient fallback to `lib/workshop/workshop-mock-data.ts` and `lib/workshop/workshop-actions.ts` when running in offline/testing mode without active Supabase credentials.
- **Realtime Broadcast**: Supabase Realtime channel `operational-intelligence` for multi-terminal sync of work order assignments and status changes.

---

## 2. Route Architecture & RBAC Security

### 2.1 Route Mapping
- Route: `/admin/repairs` (Admin Motor Repair Tracking & Workshop Service Bay Monitoring Dashboard)
- Navigation Menu Entry: Registered in `ADMIN_NAV_ITEMS` (`lib/admin/navigation.ts`) under `Store Intelligence`:
  ```typescript
  {
    id: "repairs",
    label: "Workshop Repairs",
    href: "/admin/repairs",
    category: "Store Intelligence",
    icon: Wrench, // or Gauge
  }
  ```

### 2.2 Role-Based Access Control (RBAC)
- Layout-level enforcement in `app/admin/layout.tsx` via `getServerSession()` and `evaluateRouteAccess()`.
- Page-level enforcement in `app/admin/repairs/page.tsx`:
  - If user is not authenticated: redirect to `/?notice=login_required` (or `/login`).
  - If user has staff role (`role === 'staff'`) and is a mechanic: redirect to `/staff/work-orders?notice=unauthorized_admin_access`.
  - If user is a cashier or general staff: redirect to `/staff/pos?notice=unauthorized_admin_access`.
  - If user is admin (`role === 'admin'`): allow full dashboard access.

---

## 3. Data Mapping & Schema Reconciliation

### 3.1 Work Order Status Mapping
The Jira acceptance criteria specify status labels:
- `Pending` (`QUEUED`)
- `In Progress` (`IN PROGRESS`)
- `Waiting for Parts` (`PENDING_PARTS`)
- `Quality Check` / `Ready for Release` (`COMPLETED`)

We map database `WorkOrderStatus` (`'QUEUED' | 'IN PROGRESS' | 'PENDING_PARTS' | 'COMPLETED' | 'CANCELLED'`) to user-facing badges with contextual styling:
| Database Status | Badge Label | Token Styling |
| :--- | :--- | :--- |
| `QUEUED` | Pending Queue | `bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400` |
| `IN PROGRESS` | In Repair | `bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400` |
| `PENDING_PARTS` | Waiting for Parts | `bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400` |
| `COMPLETED` | Ready for Release | `bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400` |

### 3.2 Vehicle Identity Fields
`DetailedWorkOrder` provides:
- `vehicleModel`: Motorcycle Make & Model (e.g., "Yamaha NMAX 155", "Honda Click 150i")
- `plateNumber`: Official Philippine License Plate (e.g., "ABC-1234")
- `chassisNumber`: Chassis / VIN token (e.g., `CHAS-NMAX-99214`, generated or persisted in work order metadata)
- `engineNumber`: Engine serial token

### 3.3 Timing & Duration Metrics
- `startedAt`: Timestamp when work order commenced
- `elapsedMinutes`: Calculated dynamically as `Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000))`
- `estimatedDurationMinutes`: Target completion duration in minutes
- `remainingMinutes`: Remaining time or overdue indicator

---

## 4. Component Hierarchy & UX Flow

```
app/admin/repairs/page.tsx (Server Component with RBAC guard)
 └── AdminRepairsClient (Client Component with live state & filters)
      ├── RepairsHeader (Title, live time, quick refresh, export/reassign summary)
      ├── RepairsKpiSummary (4 metric cards: Active Motors, In Repair, Waiting for Parts, Bay Utilization)
      ├── RepairsFilterBar (Search input, Status tabs, Bay selector, Mechanic selector, View switcher: Grid / Table)
      ├── ActiveRepairsGrid (Responsive card view with vehicle cards, badges, timers, and mechanic indicators)
      ├── ActiveRepairsTable (Dense desktop table view for quick scanning)
      └── RepairInspectionDrawer (Slide-over panel displaying vehicle banner, mechanic punch duration, task checklist, installed parts with inventory shelf locations, diagnostic notes, and live reassign dropdown)
```

---

## 5. Security & Audit Logging

When an administrator reassigns a work order to a new technician:
1. `assignMechanicAction({ workOrderId, mechanicId, mechanicName, bayId, adminUserId })` is invoked.
2. Updates `work_orders` table and in-memory cache.
3. Calls `recordAuditLogAction` to write an immutable entry into `audit_logs`:
   - `action`: `WORK_ORDER_MECHANIC_REASSIGNED`
   - `entity_type`: `work_order`
   - `entity_id`: `workOrderId`
   - `details`: `{ previousMechanicId, newMechanicId, mechanicName, reason: "Admin workshop dispatch reassignment" }`
