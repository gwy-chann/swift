# Data Model Specification: Admin Motor Repair Tracking & Workshop Service Bay Monitoring Dashboard

**Feature**: `specs/107-admin-motor-repair-tracking/spec.md`  
**Date**: 2026-10-26  
**Jira Ticket**: [SIAA-107](https://the-three-devsketeers.atlassian.net/browse/SIAA-107)  

---

## 1. Domain Entities & Interfaces

### 1.1 Admin Motor Repair Item (`AdminMotorRepairItem`)
Enriches `DetailedWorkOrder` with explicit chassis tracking, derived stage badge classifications, vehicle make extraction, and dynamic timing metrics.

```typescript
import type { DetailedWorkOrder, WorkOrderLaborTask, WorkOrderRequiredPart } from '@/lib/types/workshop';
import type { WorkOrderStatus } from '@/lib/types/service';

export type RepairStageBadge =
  | 'Pending'
  | 'In Progress'
  | 'Waiting for Parts'
  | 'Ready for Release';

export interface AdminMotorRepairItem extends DetailedWorkOrder {
  chassisNumber: string;
  vehicleMake: string;
  stageBadge: RepairStageBadge;
  elapsedMinutes: number;
}
```

### 1.2 Dashboard KPI Summary (`RepairsDashboardKpiSummary`)
High-level summary metrics displayed at the top of the `/admin/repairs` dashboard:

```typescript
export interface RepairsDashboardKpiSummary {
  activeRepairsCount: number;      // Total currently active motors (In Progress + Waiting for Parts)
  inProgressCount: number;         // Motors actively being worked on in bays
  waitingForPartsCount: number;    // Motors stalled waiting for inventory parts
  completedTodayCount: number;     // Motors finished today and ready for customer pickup
  occupiedBays: number;            // Count of bays with active jobs
  totalBays: number;               // Total configured bays
  bayUtilizationPercent: number;   // (occupiedBays / totalBays) * 100
}
```

### 1.3 Repairs Filter State (`RepairsFilterState`)
Reactive filter model driving search, multi-axis filtering, and presentation modes:

```typescript
export interface RepairsFilterState {
  searchQuery: string;             // Substring search on plate, model, customer name
  statusFilter: 'ALL' | WorkOrderStatus;
  mechanicFilter: 'ALL' | string;  // Mechanic profile ID or 'ALL'
  bayFilter: 'ALL' | string;       // Service bay ID or 'ALL'
  viewMode: 'grid' | 'table';      // Visual card grid vs dense administrative table
}
```

### 1.4 Admin Mechanic Reassignment Payload (`AdminReassignMechanicPayload`)
Payload submitted when an administrator reassigns a work order to an on-shift mechanic:

```typescript
export interface AdminReassignMechanicPayload {
  workOrderId: string;
  orderNumber: string;
  mechanicId: string;
  mechanicName: string;
  bayId?: string | null;
  bayName?: string;
  reason?: string;
}
```

---

## 2. Storage Mapping & Database Schema

### 2.1 Table: `public.work_orders`
| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | Primary Key |
| `order_number` | `text` | No | Unique human-readable code (e.g. `WO-2026-0001`) |
| `bay_id` | `uuid` | Yes | FK referencing `public.service_bays.id` |
| `customer_name` | `text` | No | Customer full name |
| `customer_phone` | `text` | Yes | Validated customer phone number |
| `vehicle_model` | `text` | No | Motorcycle make and model |
| `plate_number` | `text` | No | Vehicle registration license plate |
| `service_code` | `text` | No | Primary service SKU code |
| `service_name` | `text` | No | Labor service title |
| `mechanic_id` | `uuid` | Yes | FK referencing `public.profiles.id` |
| `status` | `text` | No | `'QUEUED'`, `'IN PROGRESS'`, `'PENDING_PARTS'`, `'COMPLETED'`, `'CANCELLED'` |
| `estimated_duration_minutes` | `integer` | No | Target duration in minutes |
| `started_at` | `timestamptz` | Yes | Clock-in timestamp when repair started |
| `completed_at` | `timestamptz` | Yes | Completion timestamp |
| `notes` | `text` | Yes | Customer complaint and mechanic floor notes |
| `created_at` | `timestamptz` | No | Record creation timestamp |
| `updated_at` | `timestamptz` | No | Last update timestamp |

### 2.2 Table: `public.audit_logs`
When `reassignMechanicAction` executes, an entry is inserted:
```json
{
  "action": "WORK_ORDER_MECHANIC_REASSIGNED",
  "entity_type": "work_order",
  "entity_id": "f0000000-0000-0000-0000-000000000001",
  "details": {
    "order_number": "WO-2026-0001",
    "previous_mechanic_id": "d0000000-0000-0000-0000-000000000003",
    "new_mechanic_id": "d0000000-0000-0000-0000-000000000004",
    "mechanic_name": "Alex Lim",
    "reason": "Admin live bottleneck reassignment"
  }
}
```
