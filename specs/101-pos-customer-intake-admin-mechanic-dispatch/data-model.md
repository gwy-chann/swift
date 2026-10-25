# Data Model Specification: POS Customer & Complaint Intake Prompt with Admin On-Shift Mechanic Dispatch

**Feature**: `specs/101-pos-customer-intake-admin-mechanic-dispatch/spec.md`  
**Date**: 2026-10-26  
**Jira Ticket**: [SIAA-101](https://the-three-devsketeers.atlassian.net/browse/SIAA-101)  

---

## 1. Domain Entities & Interfaces

### 1.1 Customer Intake DTO
Captures front-line customer, vehicle, and repair complaint details gathered during checkout interception when service line items exist.

```typescript
export interface CustomerIntakeData {
  customerName: string;
  customerPhone: string;
  vehicleModel: string;
  plateNumber: string;
  complaints: string;
}
```

### 1.2 Extended Checkout Payload
Extends `CheckoutPayload` (`lib/types/transaction.ts`) to carry `customerPhone` along with existing vehicle and complaint fields.

```typescript
export interface ExtendedCheckoutPayload extends CheckoutPayload {
  customerName?: string;
  customerPhone?: string; // SIAA-101: Validated Philippine mobile number
  vehicleModel?: string;
  plateNumber?: string;
  notes?: string | null;  // Carries customer complaints
}
```

### 1.3 On-Shift Mechanic Entity
Represents a workshop technician currently clocked in and eligible for work order dispatch.

```typescript
export interface OnShiftMechanic {
  id: string; // profile_id (UUID)
  name: string;
  email?: string;
  role: 'mechanic';
  status: 'on_shift' | 'break';
  clockInTime: string;
}
```

### 1.4 Assign Mechanic DTO & Action Result
Payload for administrative assignment of queued or unassigned work orders.

```typescript
export interface AssignMechanicInput {
  orderId: string;
  mechanicId: string;
  mechanicName: string;
}

export interface AssignMechanicResult {
  success: boolean;
  order?: DetailedWorkOrder;
  error?: string;
}
```

---

## 2. Database Schema Alignment

### 2.1 Table: `public.work_orders` (Supabase PostgreSQL)
Ensures exact column mapping when inserting from POS checkout:

| Column Name | Postgres Type | Nullable | Description / SIAA-101 Requirement |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | No (PK) | Generated unique work order identifier |
| `order_number` | `TEXT` | No (Unique) | Formatted order identifier (e.g., `WO-2026-4821`) |
| `bay_id` | `UUID` | Yes (FK) | Reference to `public.service_bays.id` |
| `customer_name` | `TEXT` | No | Exact customer name from intake (e.g., "Maria Santos") |
| `customer_phone` | `TEXT` | Yes | Exact validated contact phone number (e.g., "0918-123-4567") |
| `vehicle_model` | `TEXT` | No | Motorcycle make and model (e.g., "Honda Click 125i") |
| `plate_number` | `TEXT` | No | Customer license plate or registration (e.g., "123-ABC") |
| `service_code` | `TEXT` | No | Labor service code (e.g., `SRV-OIL-01`) |
| `service_name` | `TEXT` | No | Labor service descriptive title |
| `mechanic_id` | `UUID` | Yes (FK) | Reference to `public.profiles.id` (null if queued/unassigned) |
| `status` | `TEXT` | No | State: `QUEUED`, `IN PROGRESS`, `PENDING_PARTS`, `COMPLETED` |
| `notes` | `TEXT` | Yes | Full customer complaints and diagnostic notes |
| `created_at` | `TIMESTAMPTZ`| No | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ`| No | Record modification timestamp |

### 2.2 Table: `public.staff_shifts` (Active Attendance Filter)
Used by `fetchOnShiftMechanicsAction` to discover available technicians:

```sql
SELECT 
  p.id, 
  p.full_name AS name, 
  p.email, 
  p.role, 
  s.status, 
  s.clock_in AS clock_in_time
FROM public.staff_shifts s
JOIN public.profiles p ON s.profile_id = p.id
WHERE p.role = 'mechanic'
  AND s.status = 'on_shift'
ORDER BY s.clock_in ASC;
```

---

## 3. Realtime Broadcast Event Model

Payload broadcast over `operational-intelligence` channel on event `WORK_ORDER_ASSIGNED`:

```typescript
export interface WorkOrderAssignedBroadcastPayload {
  orderId: string;
  orderNumber: string;
  mechanicId: string;
  mechanicName: string;
  status: string;
  updatedAt: string;
}
```
