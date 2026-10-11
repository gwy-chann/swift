# Feature Specification: Flat-Rate Workshop Labor Schedule & Service Duration Matrix

**Feature Branch**: `feat/SIAA-40-flat-rate-workshop-labor-schedule`  
**Created**: 2026-10-11  
**Status**: Specified & Validated  
**Jira Issue**: [SIAA-40](https://the-three-devsketeers.atlassian.net/browse/SIAA-40) (STORY-7.3)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  
**Input**: User request: `/speckit https://the-three-devsketeers.atlassian.net/browse/SIAA-40`

---

## 1. Executive Summary & Objective

In a high-throughput motorcycle parts and repair workshop, service bay charges must be transparent, standardized, and benchmarked against technician time. The Service Desk Manager and Store Owner require a unified **Pricing & Labor Rates Matrix** interface (`#view-pricing` at `/admin/rates`) to:

1. Display and maintain the **Flat-Rate Labor Schedule Matrix** with standardized service titles (e.g., Oil & Gear Oil Change, CVT Cleaning & Regrease, Tire Mounting & Sealing, FI Throttle Body Reset, Front Shock Re-oil), estimated completion durations (`15m`, `45m`, `20m`, `60m`, `90m`), and flat-rate charges (`₱100.00`, `₱350.00`, `₱150.00`, `₱650.00`, `₱800.00`).
2. Maintain service durations, repair bay allocations (`Bay 1`, `Bay 2`, `Bay 3`, `Bay 4`), and flat rates with immediate catalog persistence, audit tracking, and notification feedback.
3. Synchronize updated flat rates instantly to the cashier Fast-Lane POS (`/staff/pos`) so newly added labor service line items bill at updated rates in under 500ms without manual page reloads.
4. Establish and maintain the **Standard Hourly Labor Rate Benchmark** (default `₱450.00/hour`), providing an interactive estimation calculator for unlisted diagnostic or custom fabrication jobs pro-rated by elapsed technician bay duration.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Flat-Rate Labor Schedule Matrix Display (Priority: P1)

* **As a** Service Desk Manager or Store Owner,
* **I want to** view the standardized flat-rate labor schedule matrix in the `#view-pricing` administration panel,
* **so that** all workshop repair offerings, durations, repair bays, and fees are clearly laid out in a single view matching the SWIFT design system.

**Why this priority**: Core visual and functional matrix required for workshop operations management.

**Independent Test**: Load `/admin/rates` (with container `#view-pricing`), confirm rendering of the "Flat-Rate Labor Schedule Matrix" panel with columns for Service Name, Estimated Completion Time, Flat Rate fee, Repair Bay allocation, and Status.

**Acceptance Scenarios**:
1. **Given** an authenticated manager on `/admin/rates` (`#view-pricing`), **When** viewing the "Flat-Rate Labor Schedule Matrix" panel, **Then** it renders the current schedule of workshop services including:
   - "Oil & Gear Oil Change" (`15m`, `₱100.00`, Quick Bay / Bay 1)
   - "CVT Cleaning & Regrease" (`45m`, `₱350.00`, Scooter Bay / Bay 2)
   - "Tire Mounting & Sealing" (`20m`, `₱150.00`, Quick Bay / Bay 1)
   - "FI Throttle Body Reset" (`60m`, `₱650.00`, Mechanical Bay / Bay 3)
   - "Front Shock Re-oil" (`90m`, `₱800.00`, Heavy Repair / Bay 4)
2. **Given** the schedule matrix, **When** reviewing the display, **Then** all monetary values are formatted with the Philippine Peso symbol (`₱`), durations display standard human-readable units (e.g., `15m`, `45m`, `1h 30m`), and repair bays display distinct tag badges.

---

### User Story 2 - Labor Rate and Duration Maintenance with Realtime Persistence (Priority: P1)

* **As a** Service Desk Manager,
* **I want to** update the flat rate, estimated duration, and repair bay allocation for any service (e.g., increasing CVT Cleaning from `₱350.00` to `₱400.00`),
* **so that** price adjustments immediately take effect in the catalog store with confirmation feedback and audit traceability.

**Why this priority**: Allows real-time operational rate changes reflecting parts cost shifts or labor adjustments.

**Independent Test**: Trigger an update on "CVT Cleaning & Regrease" from `₱350.00` to `₱400.00`, verify server mutation succeeds, toast notification displays confirming update, and data re-renders with new rate.

**Acceptance Scenarios**:
1. **Given** a manager updating the flat rate for "CVT Cleaning & Regrease" from `₱350.00` to `₱400.00`, **When** the change is submitted and saved, **Then** the updated rate persists in the service catalog store.
2. **Given** a successfully saved rate update, **When** the transaction finishes, **Then** a toast notification confirms the successful update with service name and new price.
3. **Given** duration adjustments (e.g., changing `45m` to `50m`), **When** submitted, **Then** the duration field persists and immediately displays in the matrix table.

---

### User Story 3 - Instant POS Service Billing Synchronization (Priority: P1)

* **As a** Counter Cashier on `/staff/pos`,
* **I want** updated labor flat rates to synchronize automatically to the POS catalog,
* **so that** when adding that labor service line item to a customer ticket, the newly configured rate (e.g. `₱400.00`) is billed without server restarts or browser cache flushes.

**Why this priority**: Eliminates billing inconsistencies between admin rate changes and cashier checkout lines.

**Independent Test**: Have a POS terminal open on `/staff/pos`. In a separate session on `/admin/rates`, update a service rate to `₱400.00`. Without refreshing the POS terminal, add that service to the active POS cart and verify the line-item unit price is `₱400.00`.

**Acceptance Scenarios**:
1. **Given** an updated flat rate for a workshop service in the labor matrix (e.g. `₱400.00`), **When** a cashier opens the POS checkout interface and adds that labor service line item to a customer ticket, **Then** the newly configured flat rate is billed without requiring server restarts or cache flushes.
2. **Given** an active POS terminal session, **When** an admin updates a service rate in `/admin/rates`, **Then** the POS in-memory service catalog receives the Supabase Realtime broadcast and updates the service card within 500ms.

---

### User Story 4 - Standard Hourly Labor Rate Benchmark & Pro-Rated Estimator (Priority: P2)

* **As a** Service Desk Manager or Store Owner,
* **I want to** configure the shop base hourly labor rate benchmark (e.g. `₱450.00/hour`) and use a dynamic pro-rated estimation tool,
* **so that** unlisted diagnostic jobs or custom fabrication tasks can be accurately estimated based on elapsed technician bay duration.

**Why this priority**: Ensures non-standard and complex fabrication jobs are charged consistently based on shop bench time.

**Independent Test**: Load `/admin/rates`, view the "Standard Hourly Labor Rate Benchmark" card, update the base rate to `₱450.00/hour`, adjust the duration slider/input to 90 minutes, and verify calculated estimate displays `₱675.00` (`1.5 hours * ₱450.00`).

**Acceptance Scenarios**:
1. **Given** custom fabrication or unlisted diagnostic jobs, **When** viewing the "Hourly Labor Rate Benchmark" section on `/admin/rates`, **Then** the base hourly rate displays current configuration (default `₱450.00/hour`).
2. **Given** a manager updating the base hourly labor rate, **When** submitting the new rate (e.g., `₱500.00/hour`), **Then** the updated benchmark rate persists in the pricing configuration store and confirmation feedback is provided.
3. **Given** an elapsed technician bay duration (e.g., `15m`, `30m`, `45m`, `60m`, `90m`, `120m` or custom minutes), **When** evaluated in the benchmark estimator, **Then** time-pro-rated labor rates are dynamically calculated as `(minutes / 60) * hourlyLaborRate` and displayed in real time.

---

## 3. Requirements

### Functional Requirements

- **FR-001**: System MUST provide the `#view-pricing` container on `/admin/rates` with the "Flat-Rate Labor Schedule Matrix" panel.
- **FR-002**: System MUST render all default baseline workshop services matching the mockup and Jira specification:
  - "Oil & Gear Oil Change" (`15m`, `₱100.00`, Bay 1)
  - "CVT Cleaning & Regrease" (`45m`, `₱350.00`, Bay 2)
  - "Tire Mounting & Sealing" (`20m`, `₱150.00`, Bay 1)
  - "FI Throttle Body Reset" (`60m`, `₱650.00`, Bay 3)
  - "Front Shock Re-oil" (`90m`, `₱800.00`, Bay 4)
- **FR-003**: System MUST provide rate, duration, and repair bay editing via `updateLaborServiceAction` with immediate optimistic UI update and audit log recording.
- **FR-004**: System MUST trigger Next.js path revalidation for `/admin/rates` and `/staff/pos` upon service rate mutations.
- **FR-005**: System MUST maintain the shop base hourly labor rate benchmark (default `₱450.00/hour`) in the pricing configuration engine (`lib/admin/pricing-actions.ts`).
- **FR-006**: System MUST provide a dedicated "Standard Hourly Labor Rate Benchmark" panel on `/admin/rates` with:
  - Base hourly rate display & editor (₱/hr)
  - Interactive pro-rated technician bay duration estimator
  - Quick-preset duration buttons (`15m`, `30m`, `45m`, `1h`, `1.5h`, `2h`) and custom duration input
  - Dynamic estimated charge calculation: `Math.round((minutes / 60) * hourlyRate)`
- **FR-007**: System MUST broadcast all labor rate mutations over Supabase Realtime channel `public:labor_services` to update POS terminals in under 500ms.
- **FR-008**: System MUST adhere strictly to SWIFT design tokens (`app/globals.css` and `lib/tokens.ts`) with zero hardcoded colors.

---

## 4. Non-Functional Requirements & Design Tokens

- **Aesthetics & Tokens**: Strict usage of SWIFT design tokens:
  - Surfaces: `bg-bg-surface`, `bg-bg-card`, `bg-bg-base`, `bg-bg-muted`
  - Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-light`
  - Brand & Accents: `bg-primary`, `text-primary`, `bg-primary-light`, `border-primary`, `bg-success`, `text-success`
  - Borders: `border-border`, `border-border-subtle`
- **Performance**: Realtime propagation under 500ms; client pro-rated estimation renders synchronously without layout shifts.
- **Accessibility**: Semantic table elements, ARIA attributes on modals and interactive calculators, minimum 4.5:1 text contrast.

---

## 5. Success Criteria

1. **Matrix Completeness**: All 5 canonical flat-rate services display correct titles, durations, repair bays, and fees in `/admin/rates`.
2. **Maintenance Accuracy**: Updating "CVT Cleaning & Regrease" to `₱400.00` updates within 1 second, displays toast confirmation, and reflects immediately on table and POS catalog.
3. **Hourly Benchmark**: Managers can update base hourly rate and dynamically pro-rate diagnostic technician bay charges accurately to within ₱0.01.
4. **Zero Regressions**: Existing POS checkout and service line items function seamlessly with updated rates.
