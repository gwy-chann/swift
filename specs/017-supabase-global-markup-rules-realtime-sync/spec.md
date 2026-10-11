# Feature Specification: Supabase Global Markup Rules Schema, Realtime Sync & Price Revalidation Engine

**Feature Branch**: `feat/SIAA-57-supabase-global-markup-rules-realtime-sync`  
**Created**: 2026-10-11  
**Status**: Specified & Validated  
**Jira Issue**: [SIAA-57](https://the-three-devsketeers.atlassian.net/browse/SIAA-57) (STORY-7.7)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  
**Input**: `/speckit https://the-three-devsketeers.atlassian.net/browse/SIAA-57`

---

## 1. Executive Summary & Objective

In a motorcycle parts and repair business (SWIFT), margins and labor pricing dictate shop profitability. Store Owners and General Managers require centralized control over baseline markup percentages (Retail OEM, Wholesale Reseller, and Performance Aftermarket) alongside the benchmark hourly labor rate.

This feature establishes:
1. **Singleton Database Schema**: A dedicated `public.pricing_rules` table enforcing a single global configuration row (`id = 1`) with strict numeric bounds (0 < markup <= 200%, hourly rate >= 0).
2. **Instant Multi-Terminal Realtime Broadcast**: Registration of `public.pricing_rules` in Supabase Realtime publication (`supabase_realtime`) with `REPLICA IDENTITY FULL`, pushing pricing updates to POS cashier terminals and inventory screens within 500ms.
3. **Strict Role-Based Security (RLS)**: Authenticated users can query pricing rules for checkout and calculation; only authorized store administrators (`public.is_admin()`) can modify pricing rules or insert audit records.
4. **Server Action & Cache Invalidation Pipeline**: Next.js Server Actions (`getPricingRulesAction`, `updatePricingRulesAction`) that persist rule changes, bind `updated_by` to the authenticated admin's UID, write immutable tamper-resistant audit logs (`public.pricing_rules_audit_logs`), and trigger instant on-demand cache revalidation for `/admin/rates`, `/staff/pos`, and `/admin/inventory`.
5. **Admin UI Global Markup Card & POS Subscription Wiring**: An interactive UI component in `#view-pricing` at `/admin/rates` for administrators to view and configure markup rules with live validation, synchronized with cashier terminals.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Singleton Pricing Rules Schema & Seed Initialization (Priority: P1)

* **As a** System Architect & Database Administrator,
* **I want** a singleton `public.pricing_rules` table with strict SQL constraints and seed values,
* **so that** store pricing configuration is guaranteed unique, valid, and initialized with standard baseline values.

**Acceptance Criteria (Scenario 1)**:
1. **Given** a Supabase PostgreSQL database instance,
2. **When** migration `20261012000002_pricing_rules.sql` is applied,
3. **Then** table `public.pricing_rules` is created with columns:
   - `id` (INT PRIMARY KEY CHECK (id = 1))
   - `retail_markup` (NUMERIC NOT NULL CHECK (retail_markup > 0 AND retail_markup <= 200))
   - `wholesale_markup` (NUMERIC NOT NULL CHECK (wholesale_markup > 0 AND wholesale_markup <= 200))
   - `aftermarket_markup` (NUMERIC NOT NULL CHECK (aftermarket_markup > 0 AND aftermarket_markup <= 200))
   - `hourly_labor_rate` (NUMERIC NOT NULL CHECK (hourly_labor_rate >= 0))
   - `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT now())
   - `updated_by` (UUID REFERENCES auth.users(id))
4. **And** seed initialization automatically inserts or guarantees row 1 exists with:
   - `retail_markup`: `35.00` (35%)
   - `wholesale_markup`: `18.00` (18%)
   - `aftermarket_markup`: `40.00` (40%)
   - `hourly_labor_rate`: `450.00` (₱450.00/hour)

---

### User Story 2 - Realtime Broadcast & Row Level Security (Priority: P1)

* **As a** Cashier or Staff Member,
* **I want** client terminals to automatically receive updated markup rules via Supabase Realtime without manual browser refreshing,
* **while** the database prevents non-admin staff from tampering with markup rules.

**Acceptance Criteria (Scenario 2)**:
1. **Given** table `public.pricing_rules`,
2. **When** added to `supabase_realtime` publication with `REPLICA IDENTITY FULL`,
3. **Then** all authenticated clients (POS, Inventory, Staff) receive instant `UPDATE` payload broadcasts in under 500ms.
4. **And** Row Level Security (RLS) allows `SELECT` for authenticated users.
5. **And** RLS strictly restricts `UPDATE` to administrators validated via `public.is_admin()`.
6. **And** RLS forbids direct client `INSERT` or `DELETE` on the singleton table.

---

### User Story 3 - Server Action Mutation, Audit Trail & Cache Revalidation (Priority: P1)

* **As a** Store Owner or General Manager,
* **I want** updating markup rules via `updatePricingRulesAction` to record who changed what and revalidate all dependent routes,
* **so that** audit history is preserved and all page caches are freshly purged.

**Acceptance Criteria (Scenario 3)**:
1. **Given** an authenticated administrator modifying the Standard Retail Markup to 38%,
2. **When** calling `updatePricingRulesAction(payload)`:
3. **Then** `public.pricing_rules` row 1 is updated with `updated_by` set to the calling user's UID (`auth.uid()`).
4. **And** Next.js on-demand cache revalidation is triggered for:
   - `revalidatePath('/admin/rates')`
   - `revalidatePath('/staff/pos')`
   - `revalidatePath('/admin/inventory')`
5. **And** an immutable security audit event is logged in `public.pricing_rules_audit_logs` capturing:
   - `changed_by` / `user_name`
   - old values vs new values for all markup and rate fields
   - `created_at` timestamp
6. **And** triggers prevent modifying or deleting audit log records (`anti-tamper`).

---

### User Story 4 - Admin Rates Page Integration & Realtime Sync UI (Priority: P2)

* **As a** Store Owner configuring rates on `/admin/rates`,
* **I want** a dedicated Global Markup Rules card rendered alongside the labor rates schedule,
* **so that** I can adjust OEM, Wholesale, and Aftermarket markups and save them with immediate visual feedback.

**Acceptance Criteria (Scenario 4)**:
1. **Given** `/admin/rates` (`#view-pricing`),
2. **When** the page loads,
3. **Then** `getPricingRulesAction()` populates the Global Markup Rules form with active retail, wholesale, aftermarket, and labor rates.
4. **And** form fields validate percentages within (0, 200] before submission.
5. **And** on saving, a confirmation toast notification appears, and values sync across the dashboard.
6. **And** POS cashier terminals subscribing via `supabase.channel('public:pricing_rules')` automatically refresh pricing calculations without page reloads.

---

## 3. Functional Requirements

- **FR-001**: System MUST create and manage the singleton `public.pricing_rules` table (`id = 1`).
- **FR-002**: Database MUST enforce check constraints: `retail_markup > 0 AND retail_markup <= 200`, `wholesale_markup > 0 AND wholesale_markup <= 200`, `aftermarket_markup > 0 AND aftermarket_markup <= 200`, and `hourly_labor_rate >= 0`.
- **FR-003**: System MUST provide an immutable audit ledger `public.pricing_rules_audit_logs` protected by an anti-tamper trigger forbidding updates and deletions.
- **FR-004**: System MUST enable Supabase Realtime publication on `public.pricing_rules` with `REPLICA IDENTITY FULL`.
- **FR-005**: Server Action `getPricingRulesAction()` MUST fetch the singleton row from Supabase, falling back safely to baseline defaults if unconfigured.
- **FR-006**: Server Action `updatePricingRulesAction(updates)` MUST validate input bounds, update row 1 in `public.pricing_rules`, log the audit entry, and revalidate `/admin/rates`, `/staff/pos`, and `/admin/inventory`.
- **FR-007**: Component `GlobalMarkupCard` MUST render on `/admin/rates` honoring all SWIFT design tokens (`bg-bg-surface`, `border-border`, `text-text-primary`, `bg-primary`, etc.) with zero hardcoded colors.
- **FR-008**: Hook `usePricingRulesRealtime` MUST manage subscription to `public:pricing_rules` and invoke client callbacks on remote updates.

---

## 4. Non-Functional & Governance Requirements

- **NFR-001 (Realtime Latency)**: Realtime update broadcasts to subscribed clients MUST occur in under 500ms.
- **NFR-002 (Security)**: RLS MUST prevent unauthorized non-admin modifications to pricing rules (`public.is_admin()`).
- **NFR-003 (Token Strictness)**: All new UI components MUST strictly utilize SWIFT semantic design tokens (`lib/tokens.ts`, `globals.css`). No arbitrary hex/rgb values allowed.
- **NFR-004 (Cache Coherence)**: Server mutations MUST purge Next.js App Router cache for admin rates, staff pos, and admin inventory.
