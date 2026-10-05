# Implementation Plan: Admin Portal Navigation Shell & Collapsible Sidebar

**Branch**: `feat/SIAA-9-admin-portal-shell` | **Date**: 2026-10-06 | **Spec**: [`specs/002-admin-portal-shell/spec.md`](spec.md)

**Input**: Feature specification from `specs/002-admin-portal-shell/spec.md`

## Summary

Implement the foundational Admin Portal Navigation Shell (`/admin/*`) featuring a permanent dark slate sidebar (`bg-bg-sidebar`), organized categorized navigation ("Store Intelligence" and "Administration"), dynamic active route highlighting (`bg-primary`), operational topbar with live terminal indicators, 1-click administrator session logout, and a responsive mobile/tablet slide-out drawer (< 768px).

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16.3.8 App Router / React 19.2.8

**Primary Dependencies**: Next.js App Router, `lucide-react` (v1.52.0), Tailwind CSS v4, `@supabase/ssr`

**Storage**: Cookies (`swift-session-role`, `swift-user-name`), Supabase Auth session

**Testing**: Static type checking (`npx tsc --noEmit`), linting (`eslint`), and end-to-end browser verification

**Target Platform**: Desktop workshop management monitors (1024px to 4K), tablets and handheld devices (< 768px)

**Project Type**: Next.js App Router Web Application Shell

**Performance Goals**: Instant client-side route transitions (<100ms), 60fps mobile drawer animations, zero layout shifts

**Constraints**: Strict adherence to SWIFT semantic design tokens (`bg-bg-sidebar`, `text-text-light`, `bg-primary`, `bg-bg-base`, etc.); zero hardcoded hex/RGB colors; WCAG AA contrast compliance

**Scale/Scope**: 8 core administrative routes (Dashboard, Inventory, POS, MotoMatcher, Reports, Users, Rates, Logs)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Assessment | Status |
| :--- | :--- | :--- | :---: |
| **I. Semantic Design Tokens** | All sidebar surfaces, topbar, active pills, badges, and text must strictly consume established SWIFT design tokens (`bg-bg-sidebar`, `bg-bg-base`, `bg-bg-surface`, `bg-primary`, `text-text-primary`, `text-text-light`). | Verified. 100% token compliant against `lib/tokens.ts` and `app/globals.css`. | **PASS** |
| **II. Single Source of Truth** | Navigation links, badge counters, profile card, and topbar must faithfully replicate `mockup/admin.html` and `docs/swift_site_map.md`. | Verified. Layout and hierarchy directly derive from `mockup/admin.html`. | **PASS** |
| **III. Type-Safe Data Architecture** | Navigation items, badge schemas, and user profile structures must be strictly typed in TypeScript. | Verified. Explicit schemas defined in `data-model.md` and `contracts/`. | **PASS** |
| **IV. Test-First Quality** | Route highlighting, responsive drawer toggling, and logout flows must be testable via quickstart scenarios. | Verified. Test journeys detailed in `quickstart.md`. | **PASS** |
| **V. Server-First & Accessibility** | Semantic HTML (`<aside>`, `<nav>`, `<header>`, `<main>`), full keyboard navigation, and ARIA landmarks. | Verified. Complete accessibility landmarks and focus rings included. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-portal-shell/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research and architecture decisions (Phase 0)
├── data-model.md        # Navigation schemas, badge types, and user models (Phase 1)
├── quickstart.md        # End-to-end verification and testing guide (Phase 1)
├── contracts/           # Component and navigation interface contracts (Phase 1)
│   └── admin-shell-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Implementation tasks (Phase 2 output via /speckit-tasks)
```

### Source Code (repository root)

```text
app/
└── admin/
    ├── layout.tsx                # Admin portal root layout with sidebar & topbar shell
    ├── page.tsx                  # Admin Dashboard overview (KPI stat cards & live health)
    ├── inventory/page.tsx        # Inventory placeholder view
    ├── pos/page.tsx              # POS placeholder view
    ├── motomatcher/page.tsx      # MotoMatcher placeholder view
    ├── reports/page.tsx          # Reports & Analytics placeholder view
    ├── users/page.tsx            # User Management placeholder view
    ├── rates/page.tsx            # Pricing & Labor Rates placeholder view
    └── logs/page.tsx             # Settings & Audit Logs placeholder view

components/
└── admin/
    ├── admin-layout-shell.tsx    # Orchestrator combining sidebar, topbar, and mobile drawer
    ├── admin-sidebar.tsx         # Permanent desktop sidebar with brand & categorized nav
    ├── admin-topbar.tsx          # Sticky topbar with dynamic title, status badge & portal switch
    ├── admin-mobile-drawer.tsx   # Slide-out drawer with backdrop for viewports < 768px
    └── nav-menu-item.tsx         # Reusable navigation link with active state & badge support

lib/
├── admin/
│   └── navigation.ts             # Authoritative admin menu items & route configurations
└── auth/
    └── actions.ts                # Expanded with logoutAction()
```

**Structure Decision**: Next.js App Router layout at `app/admin/layout.tsx` wrapping all `/admin/*` sub-routes, powered by modular components under `components/admin/` and centralized route definitions in `lib/admin/navigation.ts`.

## Complexity Tracking

> *Constitution Check passed with zero violations. No complexity exemptions required.*
