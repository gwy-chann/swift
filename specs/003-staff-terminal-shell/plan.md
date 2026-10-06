# Implementation Plan: Staff Shop Floor Terminal Layout Shell

**Branch**: `feat/SIAA-10-staff-terminal-layout-shell` | **Date**: 2026-10-07 | **Spec**: [`specs/003-staff-terminal-shell/spec.md`](spec.md)

**Input**: Feature specification from `specs/003-staff-terminal-shell/spec.md`

## Summary

Implement the dedicated Staff Shop Floor Terminal Layout Shell (`/staff/*`) featuring a high-contrast dark slate sidebar (`bg-bg-sidebar`) with the distinct `STAFF` badge, operational floor navigation (Fast-Lane POS, Stock & Shelf Finder, Model Fitment Search, Item Code Price Check, and Punch Clock with live `ON SHIFT` badge), an active shift duration counter and terminal ID in the topbar (`Active Shift: HH:MM:SS`), Admin Portal switch modal, staff user profile card with 1-click logout, and a responsive mobile drawer (< 768px).

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16.3.8 App Router / React 19.2.8

**Primary Dependencies**: Next.js App Router, `lucide-react`, Tailwind CSS v4, `@supabase/ssr`

**Storage**: Cookies (`swift-session-role`, `swift-user-name`, `swift-shift-start`), client shift timer state

**Testing**: Static type checking (`npx tsc --noEmit`), linting (`eslint`), and end-to-end browser verification

**Target Platform**: Shop floor touchscreen POS terminals (1024px to 1080p), workshop mechanic tablets, mobile barcode scanners (< 768px)

**Project Type**: Next.js App Router Web Application Shell

**Performance Goals**: Instant client-side route transitions (<100ms), 1-second accurate shift duration counter, zero layout shifts

**Constraints**: Strict adherence to SWIFT semantic design tokens (`bg-bg-sidebar`, `text-text-light`, `bg-primary`, `bg-secondary`, `bg-bg-base`, etc.); zero hardcoded hex/RGB colors; WCAG AA contrast compliance

**Scale/Scope**: 5 core staff shop floor routes (Fast-Lane POS, Stock & Shelf Finder, Model Fitment Search, Item Code Price Check, Punch Clock)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Assessment | Status |
| :--- | :--- | :--- | :---: |
| **I. Semantic Design Tokens** | All sidebar surfaces, topbar, active pills, badges, and text must strictly consume established SWIFT design tokens (`bg-bg-sidebar`, `bg-bg-base`, `bg-bg-surface`, `bg-primary`, `bg-secondary`, `text-text-primary`, `text-text-light`). | Verified. 100% token compliant against `lib/tokens.ts` and `app/globals.css`. | **PASS** |
| **II. Single Source of Truth** | Navigation links, shift status badge, profile card, and topbar must faithfully replicate `mockup/staff.html` and `docs/swift_site_map.md`. | Verified. Layout and hierarchy directly derive from `mockup/staff.html`. | **PASS** |
| **III. Type-Safe Data Architecture** | Navigation items, shift state, and user profile structures must be strictly typed in TypeScript. | Verified. Explicit schemas defined in `data-model.md` and `contracts/`. | **PASS** |
| **IV. Test-First Quality** | Route transitions, shift duration counter, admin portal switch modal, and mobile drawer must be testable via quickstart scenarios. | Verified. Test journeys detailed in `quickstart.md`. | **PASS** |
| **V. Server-First & Accessibility** | Semantic HTML (`<aside>`, `<nav>`, `<header>`, `<main>`), full keyboard navigation, and ARIA landmarks. | Verified. Complete accessibility landmarks and focus rings included. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/003-staff-terminal-shell/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research and architecture decisions (Phase 0)
├── data-model.md        # Navigation schemas, shift state, and user models (Phase 1)
├── quickstart.md        # End-to-end verification and testing guide (Phase 1)
├── contracts/           # Component and navigation interface contracts (Phase 1)
│   └── staff-shell-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Implementation tasks (Phase 2 output via /speckit-tasks)
```

### Source Code (repository root)

```text
app/
└── staff/
    ├── layout.tsx                # Staff portal root layout with sidebar & topbar shell
    ├── page.tsx                  # Staff portal default redirect/landing (Fast-Lane POS)
    ├── pos/page.tsx              # Fast-Lane POS view
    ├── search/page.tsx           # Stock & Shelf Finder view
    ├── compat/page.tsx           # Model Fitment Search view
    ├── pricecheck/page.tsx       # Item Code Price Check view
    └── clock/page.tsx            # Punch Clock & Shift Duration view

components/
└── staff/
    ├── staff-layout-shell.tsx    # Orchestrator combining sidebar, topbar, switch modal, and mobile drawer
    ├── staff-sidebar.tsx         # High-contrast staff sidebar with STAFF badge & floor nav
    ├── staff-topbar.tsx          # Terminal header with live shift counter & admin switch trigger
    ├── staff-mobile-drawer.tsx   # Slide-out drawer with backdrop for viewports < 768px
    ├── shift-duration-timer.tsx  # Live client-side shift duration counter (HH:MM:SS)
    ├── admin-switch-modal.tsx    # Managerial elevation / admin portal switch modal
    └── staff-nav-item.tsx        # Reusable navigation tab with active styling and badge support

lib/
└── staff/
    └── navigation.ts             # Authoritative staff floor navigation items and route metadata
```

**Structure Decision**: Next.js App Router layout at `app/staff/layout.tsx` wrapping all `/staff/*` sub-routes, powered by modular components under `components/staff/` and centralized route definitions in `lib/staff/navigation.ts`.
