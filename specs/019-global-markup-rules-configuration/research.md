# Research & Architectural Decisions: Global Markup Rules Configuration

**Feature**: `019-global-markup-rules-configuration`  
**Jira Issue**: [SIAA-39](https://the-three-devsketeers.atlassian.net/browse/SIAA-39) (STORY-7.2)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  

---

## 1. Technical Context & Constraints

### 1.1 Architecture & Boundaries
- **Next.js App Router**:
  - `/admin/rates`: Server Component page rendering `#view-pricing` with initial server-rendered pricing rules from `getPricingRulesAction()`.
  - `/admin/inventory`: Master catalog page rendering `InventoryCatalog`, which hosts `ProductRegistrationModal`.
- **Client Components**:
  - `GlobalMarkupCard`: Interactive form on `/admin/rates` providing inputs, bounds validation (`0 < markup <= 200`), live margin simulation for ₱1,000 item, and save dispatch.
  - `ProductRegistrationModal`: Modal dialog for new product intake, supporting dynamic markup calculations based on active pricing rules.
  - `usePricingRulesRealtime`: Client hook that subscribes to Supabase postgres_changes on table `pricing_rules` (`id = 1`) and executes callbacks when external terminals update markups.

### 1.2 Data Persistence & Fallback
- **Database**:
  - Singleton row `id = 1` in PostgreSQL table `public.pricing_rules`.
  - Immutable audit logs in `public.pricing_rules_audit_logs`.
- **In-Memory & Mock Engine (`SWIFT_DB`)**:
  - In unit test environments where Supabase network credentials are not connected, `lib/admin/pricing-actions.ts` maintains synchronized memory state `memoryPricingRules` and synchronizes `SWIFT_SEED_DATABASE.pricingRules` and `SWIFT_SEED_DATABASE.auditLogs`.
  - We define `SWIFT_DB` as an exported alias to `SWIFT_SEED_DATABASE` in `lib/mock-data/index.ts` so that references to `SWIFT_DB.pricingRules` and `SWIFT_DB.auditLogs` resolve cleanly without type or runtime friction.

---

## 2. Key Architectural Decisions

### Decision 1: Button Label & Confirmation Feedback Alignment
- **Problem**: SIAA-39 Scenario 2 requires clicking "Save Markup Rules" and verifying the alert confirmation "Global pricing rules saved!".
- **Decision**: Update `GlobalMarkupCard` so the submit button explicitly reads "Save Markup Rules" (along with saving spinner state) and the success banner contains the exact phrase "Global pricing rules saved!".

### Decision 2: Active Rules Ingestion in Inventory Catalog & Add Product Modal
- **Problem**: Previously, `ProductRegistrationModal` accepted `pricingRules?: Partial<PricingRules>`, but `InventoryCatalog` never passed `pricingRules`, and the sub-header label inside the modal hardcoded "+18%", "+35%", "+40%".
- **Decision**:
  1. In `InventoryCatalog`: Fetch `initialPricingRules` (or accept as prop from `app/admin/inventory/page.tsx`) and hook up `usePricingRulesRealtime` to keep pricing rules fresh.
  2. Pass `pricingRules` directly into `<ProductRegistrationModal pricingRules={pricingRules} ... />`.
  3. In `ProductRegistrationModal`: Derive dynamic helper text `Wholesale: +${rules.wholesaleMarkup}% | Retail: +${rules.retailMarkup}%` and use `rules.wholesaleMarkup`, `rules.retailMarkup` (OEM), and `rules.aftermarketMarkup` (Aftermarket) for all fallback math.

### Decision 3: Centralized `SWIFT_DB` Compatibility
- **Problem**: Specifications and Jira Acceptance Criteria reference `SWIFT_DB.pricingRules` and `SWIFT_DB.auditLogs`.
- **Decision**:
  - Export `SWIFT_DB = SWIFT_SEED_DATABASE` in `lib/mock-data/index.ts`.
  - Update `updatePricingRulesAction` to mutate `SWIFT_SEED_DATABASE.pricingRules` and push an audit record into `SWIFT_SEED_DATABASE.auditLogs` in addition to Supabase ledger updates.
  - This ensures synchronous tests and mockup parity while maintaining production database persistence.

### Decision 4: Design Token Compliance
- **Rule**: Zero hardcoded hex/rgb colors.
- **Decision**: Use only tokens defined in `lib/tokens.ts` and `app/globals.css`:
  - `bg-bg-surface`, `bg-bg-base`, `bg-bg-input`, `bg-bg-muted`
  - `border-border`, `border-border-subtle`, `border-border-focus`
  - `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-light`
  - `bg-primary`, `text-primary`, `bg-primary-hover`, `bg-primary-light`
  - `bg-success`, `text-success`, `bg-success-light`
  - `bg-danger`, `text-danger`, `bg-danger-light`
