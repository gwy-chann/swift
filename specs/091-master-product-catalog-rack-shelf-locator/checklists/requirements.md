# Specification Quality Checklist: Master Product Catalog & Physical Rack/Shelf Locator

**Feature**: [spec.md](../spec.md)  
**Jira Key**: [SIAA-91](https://the-three-devsketeers.atlassian.net/browse/SIAA-91)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Created**: 2026-10-25  
**Status**: VERIFIED & COMPLETE  

---

## 1. Content Quality

- [x] **Value-Focused**: Scope directly addresses fast catalog lookups and part registration with physical rack and shelf tags for floor mechanics.
- [x] **Role Demarcation**: Explicitly specifies Inventory Clerk and Admin capabilities.
- [x] **Complete Sections**: Executive summary, clarifications, user stories, Gherkin scenarios, edge cases, functional requirements, and success criteria are all completed.

---

## 2. Requirement Completeness

- [x] **Zero Ambiguity**: No `[NEEDS CLARIFICATION]` markers remain; exact endpoints, pricing markup rates (35% OEM retail, 40% aftermarket retail, 18% wholesale), rack/shelf locator attributes, and HTTP 409 conflict rules are documented.
- [x] **Testable Scenarios**: Gherkin scenarios define Given/When/Then steps with exact status codes (201 Created, 409 Conflict, 400 Bad Request, 200 OK) and response payloads.
- [x] **Measurable Success Criteria**: Performance (<50ms execution), exact markup math parity, 100% duplicate SKU prevention, and shelf navigation speed (<5 seconds) are specified.
- [x] **Edge Cases Bounded**: Blank fields, negative/zero costs, case-insensitive duplicate SKUs, and omitted locator tags are fully defined.

---

## 3. Architecture & Performance Compliance

- [x] **PricingCalculatorService**: Dedicated Spring service computing 18% wholesale and 35%/40% retail markups using `BigDecimal` with half-up rounding.
- [x] **Physical Locator Columns**: Database migration and entity mapping for `rack_id`, `shelf_id`, and `bin_locator` with backward-compatible composite `location`.
- [x] **Strangler Reverse Proxy**: Strangler routing `/api/v1/admin/products` to Spring Boot with `@fallback_to_nextjs`.
- [x] **Design Tokens & Accessibility**: Preserves existing SWIFT semantic token styling and WCAG 2.1 AA compliance across catalog tables and badges.

---

## 4. Contract Parity Checklist

- [x] `POST /api/v1/admin/products` provides parity with `createProductAction` (`CreateProductResult`).
- [x] `GET /api/v1/admin/products` provides parity with `getProductsAction` (`Product[]`).
- [x] SKU normalization and case-insensitive uniqueness check returning HTTP 409 Conflict on collision.
