# Technical Implementation Plan: Supabase Realtime Fitment Updates & Stock Alert Broadcast for Floor Terminals

**Feature Branch**: `feat/SIAA-55-motomatcher-realtime-stock-sync`  
**Feature Spec**: [`specs/025-motomatcher-realtime-stock-sync/spec.md`](spec.md)  
**Jira Issue**: [SIAA-55](https://the-three-devsketeers.atlassian.net/browse/SIAA-55) (STORY-4.8)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Technical Context & Constraints

- **Stack**: Next.js 15 (App Router), React 19 Client Component, TypeScript 5, Tailwind CSS v4.
- **Data & Realtime**: PostgreSQL via Supabase Realtime WebSocket client (`@supabase/supabase-js`).
- **Publication**: `supabase_realtime` publication must include `public.product_fitments` and `public.products` with `REPLICA IDENTITY FULL`.
- **Channels**: `motomatcher-matrix` (listening to `postgres_changes` on `products` and `product_fitments`) and cross-listening to `realtime:products`.
- **State Engine**: Centralized reactive `inventoryStore` (`lib/store/inventory-store.ts`) ensuring automatic propagation to all subscribers.
- **Design Tokens**: Strict compliance with SWIFT semantic design tokens (`app/globals.css`, `lib/tokens.ts`). Zero hardcoded hex/RGB colors.

---

## 2. Constitution Check

- **I. Semantic Design Tokens & Zero Hardcoded Colors (NON-NEGOTIABLE)**:
  - In Stock: `bg-success-light text-success border border-success/20`
  - Low Stock: `bg-accent-light text-accent border border-accent/20`
  - Out of Stock: `<span class="badge badge-danger">Out of Stock</span>` (`bg-danger-light text-danger border border-danger/20 badge badge-danger`)
  - No arbitrary hex/rgb or non-token Tailwind palette classes.
- **II. Single Source of Truth & Specification Fidelity**:
  - Implements all user stories and acceptance criteria from Jira SIAA-55.
  - Matches routes and interaction layouts in `../mockup/staff.html` and `../docs/features.md`.
- **III. Type-Safe Data Architecture & Domain Integrity**:
  - Zod schemas in `contracts/motomatcher-realtime.ts`.
  - Strongly typed options and result interfaces for `useMotoMatcherRealtime`.
- **IV. Test-First Quality & Contract Verification**:
  - Comprehensive unit tests verifying event handling, Out of Stock transitions, button disabling, reconnection, and graceful offline fallback.
- **V. Server-First Performance & Accessibility Standards**:
  - Client hooks confined to interactive leaf components (`"use client"`).
  - ARIA attributes and accessible semantic states (`disabled`, `aria-live="polite"`).

---

## 3. Component Hierarchy & File Mapping

```text
supabase/migrations/
  └── 20261017000000_motomatcher_realtime.sql        # Supabase Realtime publication registration

lib/
  ├── types/
  │   └── motomatcher.ts                             # Realtime hook types & contracts
  ├── hooks/
  │   ├── use-motomatcher-realtime.ts                # Realtime subscription engine
  │   └── __tests__/
  │       └── use-motomatcher-realtime.test.ts       # Unit tests for hook & store sync
  └── store/
      └── inventory-store.ts                         # Product updates dispatching

app/staff/compat/
  └── page.tsx                                       # Floor MotoMatcher with reactive badges & disabled button
```

---

## 4. Implementation Phasing Strategy

### Unit 1: Database Migration
- Write `supabase/migrations/20261017000000_motomatcher_realtime.sql`.
- Add `public.product_fitments` and `public.products` to `supabase_realtime` publication.
- Set `REPLICA IDENTITY FULL` on both tables.

### Unit 2: Hook Architecture & Realtime Types
- Define `UseMotoMatcherRealtimeOptions` and `UseMotoMatcherRealtimeResult` in `lib/types/motomatcher.ts` or `lib/types/realtime.ts`.
- Implement `useMotoMatcherRealtime(activeModelId, options)` in `lib/hooks/use-motomatcher-realtime.ts`.
- Subscribe to `motomatcher-matrix` channel with handlers for `products` and `product_fitments`.
- Implement automatic reconnection, status tracking, and optimistic cache invalidation.

### Unit 3: Staff Floor Terminal UI Integration
- Wire `useMotoMatcherRealtime` in `app/staff/compat/page.tsx`.
- Render realtime connection status badge / indicator.
- Update stock badge rendering:
  - `stock <= 0` -> `<span class="badge badge-danger">Out of Stock</span>` with `bg-danger-light text-danger border-danger/20`.
  - `0 < stock <= minThreshold` -> Low Stock badge.
  - `stock > minThreshold` -> Healthy In Stock badge.
- Disable the "Add to POS" button when `stock <= 0` with proper disabled styling and ARIA attributes.

### Unit 4: Test Suite & Verification
- Add comprehensive test suite in `lib/hooks/__tests__/use-motomatcher-realtime.test.ts`.
- Verify full test suite passes with `npm test`.
- Verify type safety with `npx tsc --noEmit`.
