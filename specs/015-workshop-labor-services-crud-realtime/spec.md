# Feature Specification: Supabase Workshop Labor Services Admin CRUD Actions & POS Realtime Synchronization

**Feature Branch**: `feat/SIAA-59-workshop-labor-services-crud-realtime`  
**Created**: 2026-10-11  
**Status**: Specified & Clarified  
**Jira Issue**: [SIAA-59](https://the-three-devsketeers.atlassian.net/browse/SIAA-59) (STORY-7.8)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  
**Input**: User request: `/speckit https://the-three-devsketeers.atlassian.net/browse/SIAA-59`

---

## 1. Executive Summary & Objective

In a motorcycle parts and quick-service shop, workshop labor services (such as oil changes, CVT servicing, tire installation, brake overhauls, fuel injection cleaning, and shock rebuilds) are sold either standalone or jointly with physical motorcycle parts. Service Desk Managers and Workshop Administrators need a centralized administration portal to manage flat-rate labor rates, assign repair bays, adjust standard service durations, toggle service visibility, and register new services.

Crucially, when labor rates or services are updated in the Administrative Portal (`/admin/rates`), counter terminals running the Fast-Lane POS (`/staff/pos`) across the shop floor must synchronize immediately in under 500 milliseconds via Supabase Realtime without requiring cashiers to refresh their browsers. Furthermore, every rate mutation must be permanently recorded in an immutable audit ledger (`service_rate_audit_logs`) to ensure non-repudiation and rate integrity.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Administrative RLS Enforcement for Labor Services (Priority: P1)

* **As a** Security Compliance Auditor & Store Owner,
* **I want** Row Level Security (RLS) on `public.labor_services` and `public.service_rate_audit_logs` strictly enforced,
* **so that** unauthorized staff members or anonymous guests cannot tamper with labor pricing or audit trails.

**Why this priority**: Core security invariant preventing unauthorized rate tampering.

**Independent Test**: Verify via unit/integration tests that unauthenticated or non-admin staff queries to mutate `labor_services` or delete from `service_rate_audit_logs` are rejected with `permission denied`, while admin queries succeed.

**Acceptance Scenarios**:
1. **Given** table `public.labor_services`, **When** an authenticated non-admin staff member attempts an `INSERT`, `UPDATE`, or `DELETE` query, **Then** the database rejects the query with permission denied (HTTP 403 / PostgreSQL RLS violation).
2. **Given** table `public.labor_services`, **When** an authenticated user with `admin` role or `service_role` executes an `INSERT`, `UPDATE`, or `DELETE` query, **Then** the database allows the operation and persists the change.
3. **Given** table `public.service_rate_audit_logs`, **When** any user attempts an `UPDATE` or `DELETE` query, **Then** the database rejects the mutation because the audit ledger is append-only.

---

### User Story 2 - Labor Service Mutation Server Actions with Audit Logging (Priority: P1)

* **As a** Service Desk Manager,
* **I want** server actions (`createLaborServiceAction`, `updateLaborServiceAction`, `toggleServiceStatusAction`, `deleteLaborServiceAction`),
* **so that** I can create new workshop services, update pricing and durations, toggle active status, and maintain an immutable audit trail.

**Why this priority**: Core administrative business capability required to manage shop floor rates.

**Independent Test**: Invoking `updateLaborServiceAction(serviceId, { rate: 400 })` updates the service rate, updates `updated_at`, triggers Next.js path revalidations (`/admin/rates`, `/staff/pos`), and logs an entry to `service_rate_audit_logs`.

**Acceptance Scenarios**:
1. **Given** an existing labor service "CVT Cleaning & Regreasing" (`SRV-CVT-01`) currently priced at ₱350, **When** calling `updateLaborServiceAction(serviceId, { rate: 400, userName: "Admin Manager" })`, **Then** the record in `public.labor_services` is updated with `rate = 400.00` and `updated_at = now()`.
2. **Given** a successful rate update, **When** the server action completes, **Then** an audit entry is inserted into `public.service_rate_audit_logs` capturing `service_id`, `service_code`, `old_rate`, `new_rate`, `reason`, `user_name`, and `created_at`.
3. **Given** completion of any service mutation, **When** paths are revalidated, **Then** `revalidatePath('/admin/rates')` and `revalidatePath('/staff/pos')` are called.
4. **Given** calling `toggleServiceStatusAction(serviceId, false)`, **When** the action completes, **Then** the service's `active` flag is set to `false`, effectively soft-deleting/archiving it from active POS selection.
5. **Given** calling `deleteLaborServiceAction(serviceId)`, **When** confirmed, **Then** if the service has no active references, it is removed from `public.labor_services`.

---

### User Story 3 - Instant POS Service Billing Synchronization via Realtime (Priority: P1)

* **As a** Counter Cashier on `/staff/pos`,
* **I want** the Flat-Rate Workshop Services catalog cards to instantly reflect rate and status changes broadcast from the Admin portal,
* **so that** billing is synchronized across all terminals in under 500ms without manual page refreshes.

**Why this priority**: Eliminates price discrepancy between management decisions and customer checkout.

**Independent Test**: When a service rate is updated in the database, the POS subscriber on `supabase.channel('public:labor_services')` receives the PostgreSQL CDC event and updates the in-memory/state catalog price in <500ms.

**Acceptance Scenarios**:
1. **Given** an open POS terminal session on `/staff/pos` displaying "CVT Cleaning & Regreasing" at ₱350, **When** an admin updates the rate to ₱400 in `/admin/rates`, **Then** the POS terminal's Realtime subscriber on `public.labor_services` catches the `UPDATE` payload and updates the catalog card to ₱400 without reloading the page.
2. **Given** an admin creates a new service in `/admin/rates`, **When** the `INSERT` payload is broadcast, **Then** the new service card appears in `/staff/pos` under the "SERVICES" tab immediately.
3. **Given** an admin toggles a service to inactive (`active = false`), **When** the update event is broadcast, **Then** the service is instantly hidden from the active POS selection grid.

---

### User Story 4 - Admin Rates Matrix Management UI (Priority: P2)

* **As an** Administrator accessing `/admin/rates`,
* **I want** an interactive Flat-Rate Workshop Labor Schedule Matrix with inline rate editing modal, status toggling, and new service registration,
* **so that** I have an intuitive, responsive management interface adhering strictly to SWIFT design tokens.

**Why this priority**: Visual interface for managers to execute the business actions.

**Independent Test**: Load `/admin/rates`, view the table of workshop services with bay badges, click "Edit Rate" to open modal, change rate, submit, and observe optimistic UI update.

**Acceptance Scenarios**:
1. **Given** `/admin/rates`, **When** loaded, **Then** all workshop services are rendered with code, name, bay, rate (formatted as ₱), duration, active status badge, and action buttons.
2. **Given** the "Edit Rate" button, **When** clicked, **Then** an inline modal opens pre-filled with current service data allowing rate and duration adjustments.
3. **Given** the "Add New Service" button, **When** clicked, **Then** a modal opens with fields for Code, Name, Bay (dropdown with standard bays + custom option), Rate, Duration, and Description.
4. **Given** the UI layout, **When** rendered in light or dark mode, **Then** all styling uses SWIFT semantic tokens (`bg-bg-card`, `text-text-primary`, `text-primary`, `border-border`, etc.) with zero hardcoded hex/rgb.

---

## 3. Requirements

### Functional Requirements

- **FR-001**: System MUST provide server actions `createLaborServiceAction`, `updateLaborServiceAction`, `toggleServiceStatusAction`, and `deleteLaborServiceAction` in `lib/admin/service-actions.ts`.
- **FR-002**: System MUST validate input payloads using Zod schemas (`LaborServiceInputSchema`, `UpdateLaborRateSchema`).
- **FR-003**: System MUST enforce that `rate` is a positive numeric amount (₱ > 0) with up to 2 decimal places.
- **FR-004**: System MUST record all rate changes in an immutable table `public.service_rate_audit_logs`.
- **FR-005**: System MUST configure `public.labor_services` in the `supabase_realtime` publication with `REPLICA IDENTITY FULL`.
- **FR-006**: System MUST provide a client hook `useLaborServicesRealtime` (or subscribe via `supabase.channel('public:labor_services')`) that handles `INSERT`, `UPDATE`, and `DELETE` events.
- **FR-007**: Terminal `/staff/pos` MUST update active labor services state dynamically upon receiving Realtime events.
- **FR-008**: System MUST execute Next.js `revalidatePath('/admin/rates')` and `revalidatePath('/staff/pos')` upon mutation.
- **FR-009**: All UI components MUST adhere to the SWIFT design tokens (`app/globals.css`, `lib/tokens.ts`) with zero arbitrary hex/rgb colors.

### Key Entities

- **`LaborService`**:
  - `id`: UUID (Primary Key)
  - `code`: String (Unique service identifier, e.g. "SRV-CVT-01")
  - `name`: String (Human-readable name)
  - `bay`: String (Repair bay assignment, e.g. "Bay 2 / Scooter Bay")
  - `rate`: Numeric (Flat rate price in PHP)
  - `duration`: String (Estimated duration, e.g. "45 mins")
  - `description`: String (Optional scope description)
  - `active`: Boolean (Active status flag)
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

- **`ServiceRateAuditLog`**:
  - `id`: UUID (Primary Key)
  - `serviceId`: UUID (Foreign key to `labor_services.id`)
  - `serviceCode`: String (Historical code snapshot)
  - `oldRate`: Numeric (Rate before change)
  - `newRate`: Numeric (Rate after change)
  - `reason`: String (Change reason or notes)
  - `userName`: String (Attribution: Admin user name)
  - `createdAt`: Timestamp

---

## 4. Success Criteria

### Measurable Outcomes

- **SC-001**: Realtime propagation latency from admin rate update to POS terminal card update is under 500ms.
- **SC-002**: 100% of unauthorized (non-admin) mutations against `labor_services` are rejected by PostgreSQL RLS.
- **SC-003**: 100% of rate adjustments create an immutable audit record in `service_rate_audit_logs`.
- **SC-004**: Zero hardcoded hex/rgb color values across all newly created or modified component files.
- **SC-005**: Automated unit and integration test coverage for all server actions and realtime handling.

---

## 5. Assumptions & Dependencies

- `public.labor_services` table already exists from migration `20261011000000_pos_labor_services.sql`.
- Migration `20261013000000_labor_services_realtime_and_audit.sql` will add `labor_services` to `supabase_realtime`, set replica identity to FULL, and create `service_rate_audit_logs`.
- Supabase environment credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are available with fallback to Prisma ORM / mock store during isolated unit testing.
