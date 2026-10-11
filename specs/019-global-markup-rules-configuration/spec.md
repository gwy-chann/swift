# Feature Specification: Global Markup Rules Configuration (Retail, Wholesale & Aftermarket)

**Feature Branch**: `feat/SIAA-39-global-markup-rules-configuration`  
**Created**: 2026-10-11  
**Status**: Specified & Validated  
**Jira Issue**: [SIAA-39](https://the-three-devsketeers.atlassian.net/browse/SIAA-39) (STORY-7.2)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  
**Input**: `/speckit https://the-three-devsketeers.atlassian.net/browse/SIAA-39`

---

## 1. Executive Summary & Objective

In the SWIFT Motorcycle Parts POS and Inventory Management system, business profitability relies on predictable, consistent margin structures across diverse catalog items. Store Owners and General Managers must configure baseline markup percentage rules across standard retail sales, wholesale/reseller trade, and performance aftermarket tuning parts.

While foundational database schema and realtime pub/sub primitives were provisioned in prerequisite story SIAA-57, this feature completes the end-to-end administration experience and calculation integration:
1. **Interactive Control Panel in `#view-pricing` (`/admin/rates`)**: Allows store administrators to inspect current markup percentages (Standard Retail, Wholesale/Reseller, Performance Aftermarket) and mutate them with real-time feedback and validation.
2. **Numeric Percentage Validation & Confirmation**: Enforces positive numeric bounds (`0 < markup <= 200%`), updates the centralized data engine (`SWIFT_DB.pricingRules` and Supabase singleton), and presents explicit alert confirmation ("Global pricing rules saved!").
3. **Cross-Module Calculation Propagation to New Product Intake**: Ensures that whenever an inventory clerk opens the Add Product modal (`ProductRegistrationModal`) and enters a unit cost (e.g. `₱500.00`), the wholesale price dynamically calculates using the active wholesale markup (e.g., `+20% -> ₱600.00`) and retail price dynamically calculates using the active retail markup (e.g., `+38% -> ₱690.00`), without stale defaults.
4. **Security & Financial Audit Trail**: Whenever an administrator saves markup adjustments, an immutable audit event is recorded in the audit logging engine (`SWIFT_DB.auditLogs` and `public.pricing_rules_audit_logs`) documenting the previous vs. updated markup percentages and the authenticated administrator account ID.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Global Markup Rule Control Panel Initialization (Priority: P1)

* **As a** Store Owner or General Manager,
* **I want to** navigate to Pricing & Labor Rates (`#view-pricing` at `/admin/rates`) and view active markup percentages,
* **so that** I have immediate visibility over shop profit baselines for retail, wholesale, and aftermarket parts.

**Acceptance Criteria (Scenario 1)**:
1. **Given** an authenticated admin navigating to Pricing & Labor Rates (`#view-pricing` at `/admin/rates`),
2. **When** the view renders,
3. **Then** the Global Parts Markup Rules panel displays current values for:
   - Standard Retail Markup % (default `35%`)
   - Wholesale/Reseller Markup % (default `18%`)
   - Performance Aftermarket Markup % (default `40%`)
4. **And** displays visual live margin simulation for a benchmark `₱1,000.00` motorcycle part item across all three tiers.

---

### User Story 2 - Modification & Validation of Markup Percentages (Priority: P1)

* **As a** Store Administrator,
* **I want to** adjust markup percentages (e.g., retail markup to 38%) and save changes with strict validation,
* **so that** store margins are adjusted accurately without accidental negative or out-of-bounds percentages.

**Acceptance Criteria (Scenario 2)**:
1. **Given** an administrator adjusting the Standard Retail Markup to `38%`,
2. **When** clicking "Save Markup Rules",
3. **Then** the system validates that input values are positive numeric percentages (`> 0` and `<= 200`),
4. **And** updates `SWIFT_DB.pricingRules` and Supabase `public.pricing_rules` with the new values,
5. **And** displays an alert confirmation containing `"Global pricing rules saved!"`.
6. **And** if an administrator enters an invalid value (e.g., `0%`, `-5%`, or `250%`), submission is blocked and a clear inline error message indicates the acceptable range `(0, 200]`.

---

### User Story 3 - Propagation to New Product Registration Calculation (Priority: P1)

* **As an** Inventory Clerk or Parts Manager,
* **I want** the Add Product modal in Inventory to dynamically derive wholesale and retail prices from the active global markup rules,
* **so that** new catalog items automatically inherit store-wide pricing policies without manual margin computation.

**Acceptance Criteria (Scenario 3)**:
1. **Given** updated global markup rules (e.g. Retail at `38%`, Wholesale at `20%`),
2. **When** an inventory clerk opens the Add Product modal (`ProductRegistrationModal`) on `/admin/inventory` and enters a base cost of `₱500.00`,
3. **Then** the auto-calculated wholesale price dynamically updates to `₱600.00` (`+20%`),
4. **And** the retail price dynamically updates to `₱690.00` (`+38%` for OEM or `+45%` for Aftermarket depending on spec type),
5. **And** the pricing sub-header dynamically reflects the active percentage rules (`Wholesale: +20% | Retail: +38% (OEM)`).

---

### User Story 4 - Security Audit Trail Logging on Markup Adjustment (Priority: P1)

* **As a** System Auditor or Store Owner,
* **I want** every markup rule change to generate an immutable audit record,
* **so that** all pricing modifications can be traced to a specific user and timestamp.

**Acceptance Criteria (Scenario 4)**:
1. **Given** any modification made to the global markup rules,
2. **When** the admin saves the configuration,
3. **Then** an immutable audit record is logged in `SWIFT_DB.auditLogs` and `public.pricing_rules_audit_logs`,
4. **And** the record details the previous vs. updated markup percentages (e.g., `Retail: 35% -> 38%`),
5. **And** the record contains the admin account ID / display name and timestamp.

---

## 3. Functional Requirements & Invariants

- **FR-001**: Container element for pricing administration MUST feature id `#view-pricing` on `/admin/rates`.
- **FR-002**: Markup rules form MUST provide input controls for:
  - Standard Retail Markup (`retailMarkup`, default `35%`)
  - Wholesale / Reseller Markup (`wholesaleMarkup`, default `18%`)
  - Performance Aftermarket Markup (`aftermarketMarkup`, default `40%`)
- **FR-003**: The save action button MUST include accessible label text `"Save Markup Rules"`.
- **FR-004**: Confirmation toast and banner MUST present `"Global pricing rules saved!"`.
- **FR-005**: All input percentages MUST satisfy `0 < value <= 200`. Values `<= 0` or `> 200` MUST be rejected with `VALIDATION_ERROR`.
- **FR-006**: Centralized reactive engine `SWIFT_DB.pricingRules` and `SWIFT_DB.auditLogs` MUST be kept synchronized alongside Supabase PostgreSQL persistence.
- **FR-007**: `ProductRegistrationModal` and `InventoryCatalog` MUST receive and react to active `pricingRules` (including real-time updates via `usePricingRulesRealtime`), dynamically updating auto-calculated prices whenever `cost` changes.
- **FR-008**: All UI styling MUST strictly utilize SWIFT semantic tokens (`bg-bg-surface`, `border-border`, `text-text-primary`, `bg-primary`, `bg-success-light`, `text-success`, etc.) with zero hardcoded hex/rgb values.

---

## 4. Success Criteria

1. 100% of Jira SIAA-39 Acceptance Scenarios pass automated testing.
2. Zero TypeScript errors (`npm run typecheck`).
3. Complete compliance with Tailwind CSS v4 and SWIFT Design Tokens.
4. Clean audit trail records produced on every markup update.

---

## 5. Clarifications & Resolved Edge Cases

- **Q1: What happens if an admin enters fractional percentages like 37.5%?**  
  *Resolution*: Floats with up to two decimal places are supported and stored precisely as numeric types (`NUMERIC(5,2)` in PostgreSQL and `number` in TypeScript).
- **Q2: Does changing global markup retroactively reprice existing inventory products?**  
  *Resolution*: No. As specified in Jira SIAA-39 and SIAA-16, global markup rules govern default margin computations for *new product intake* (Add Product modal) and margin simulations. Existing product records retain their assigned wholesale and retail prices unless individually edited or batch-adjusted in inventory.
- **Q3: What audit log structure is recorded in `SWIFT_DB.auditLogs`?**  
  *Resolution*: Standard `AuditLog` format `{ id, timestamp, user, action, ip }`, e.g.: `action: "Modified Global Retail Markup from 35% to 38%, Wholesale from 18% to 20%"`. Supabase `pricing_rules_audit_logs` simultaneously stores the structured columns (`old_retail_markup`, `new_retail_markup`, etc.).

