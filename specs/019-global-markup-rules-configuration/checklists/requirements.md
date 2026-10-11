# Requirements Quality Checklist: Global Markup Rules Configuration

**Feature**: `019-global-markup-rules-configuration`  
**Jira Issue**: [SIAA-39](https://the-three-devsketeers.atlassian.net/browse/SIAA-39)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  

---

## 1. Specification Completeness & Traceability

- [x] **CHK001 User Stories**: Every user scenario follows the Mike Cohn format with clear user persona and business intent.
- [x] **CHK002 Acceptance Scenarios**: Contains 4 concrete Gherkin scenarios directly mapped to Jira SIAA-39 requirements.
- [x] **CHK003 Default Percentages**: Baseline values verified (Retail `35%`, Wholesale `18%`, Aftermarket `40%`).
- [x] **CHK004 Range Constraints**: Numeric boundaries explicitly defined as `(0, 200]` with negative, zero, and overflow error cases.
- [x] **CHK005 Container Selector**: Container has id `#view-pricing` on `/admin/rates`.

---

## 2. Cross-Module Integration & Propagation

- [x] **CHK006 Add Product Modal Wiring**: `ProductRegistrationModal` receives active `pricingRules` dynamically via `InventoryCatalog`.
- [x] **CHK007 Dynamic Price Auto-calculation**:
  - Unit Cost `₱500.00` + Wholesale `20%` -> `₱600.00`.
  - Unit Cost `₱500.00` + Retail `38%` -> `₱690.00`.
- [x] **CHK008 Realtime Propagation**: Changes made on `/admin/rates` broadcast via Supabase Realtime channel and update inventory screens without page reload.
- [x] **CHK009 Audit Logging**: Both `SWIFT_DB.auditLogs` and `public.pricing_rules_audit_logs` record old vs. new values and user identity.

---

## 3. Design System & Accessibility

- [x] **CHK010 SWIFT Design Tokens**: 100% compliant with semantic tokens (`bg-bg-surface`, `border-border`, `text-text-primary`, `bg-primary`, `bg-success-light`, `text-success`). Zero hardcoded hex/rgb.
- [x] **CHK011 Responsive Layout**: Grid displays cleanly on mobile (`grid-cols-1`) and desktop (`md:grid-cols-3`).
- [x] **CHK012 Accessibility (WAI-ARIA)**: Form controls feature associated `<label htmlFor="...">`, `role="alert"` on errors/confirmations, and keyboard navigation.
