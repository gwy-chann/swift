# Requirements Quality Checklist: Supabase New Product Registration Server Action & SKU Uniqueness

**Purpose**: Validate requirement completeness, clarity, testability, design tokens adherence, and security invariants for SIAA-47 before technical implementation.
**Created**: 2026-10-11
**Feature**: [spec.md](../spec.md)

**Note**: This custom checklist is generated following the SpecKit SDD workflow.
**Review Ownership**: Requirements-quality review artifact.
**Marker Semantics**: `[x]` indicates that the criterion is verified and satisfied in requirements and specifications.

---

## 1. Requirement Completeness & Scenario Alignment

- [x] CHK001 User stories follow Mike Cohn format with testable outcomes and explicit business value.
- [x] CHK002 Acceptance scenarios match Gherkin syntax (Given/When/Then) covering duplicate collision, initial stock log, and server action validation.
- [x] CHK003 Duplicate SKU collisions explicitly handle case-insensitive variants (e.g., `yam-nmax-bl01` vs `YAM-NMAX-BL01`).
- [x] CHK004 Automated wholesale and retail markup calculations preserve SWIFT business tiers (+18% Wholesale, +35% OEM Retail, +40% Aftermarket Retail).
- [x] CHK005 Inbound stock logging is atomic with product insertion when initial stock > 0.

## 2. Technical Contracts & Architecture

- [x] CHK006 Server action signature `createProductAction(payload)` defined with strict TypeScript return contract.
- [x] CHK007 Error responses return structured error codes including `SKU_ALREADY_EXISTS` and `DATABASE_ERROR`.
- [x] CHK008 Database migration specifies case-insensitive functional unique index on `LOWER(sku)`.
- [x] CHK009 Revalidation target explicitly points to `revalidatePath('/admin/inventory')`.
- [x] CHK010 Fallback behavior to Prisma transaction defined for offline or disconnected test environments.

## 3. UI/UX & SWIFT Design Tokens

- [x] CHK011 Zero hardcoded hex/rgb colors; all components strictly consume SWIFT semantic design tokens.
- [x] CHK012 Header button `+ Add Part` triggers `NewProductModal` / `ProductRegistrationModal` with auto-focus on SKU input.
- [x] CHK013 Successful creation prepends item directly into the active `InventoryStore` state for instant table update.
- [x] CHK014 Toast notifications provide visual confirmation or actionable error descriptions.
- [x] CHK015 Accessibility requirements met (dialog roles, ARIA labels, keyboard escape handling).

---

## Notes

- Requirements-quality criteria verified against `../spec.md` and Jira issue `SIAA-47`.
