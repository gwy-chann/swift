<!--
Sync Impact Report:
- Version change: Unversioned Template → 1.0.0 (Initial Ratification)
- List of modified principles:
  - [PRINCIPLE_1_NAME] → I. Semantic Design Tokens & Zero Hardcoded Colors (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Single Source of Truth & Specification Fidelity
  - [PRINCIPLE_3_NAME] → III. Type-Safe Data Architecture & Domain Integrity
  - [PRINCIPLE_4_NAME] → IV. Test-First Quality & Contract Verification
  - [PRINCIPLE_5_NAME] → V. Server-First Performance & Accessibility Standards
- Added sections:
  - Technical Constraints & Stack Standards
  - Development Workflow & Quality Gates
- Removed sections: None
- Follow-up TODOs: None
-->

# SWIFT Project Constitution

## Core Principles

### I. Semantic Design Tokens & Zero Hardcoded Colors (NON-NEGOTIABLE)
All user interface elements MUST strictly consume the semantic design tokens established in `app/globals.css` and `lib/tokens.ts`. Hardcoded hex, RGB, HSL values and arbitrary default Tailwind palette classes (e.g., `text-gray-900`, `bg-blue-600`) are strictly forbidden. Dark and light mode compatibility MUST function automatically through CSS variable token inheritance without scattered manual utility overrides. Canvas, charts, and programmatic visualizations MUST import token definitions from `@/lib/tokens`.

### II. Single Source of Truth & Specification Fidelity
Implementations MUST strictly adhere to the authoritative project specifications and UI mockups. Routes and sub-modules MUST mirror `../docs/swift_site_map.md`. Business logic, pricing tiers (retail vs. wholesale), labor rates, motorcycle fitment compatibility matrices, and inventory workflows MUST conform to `../docs/features.md`. Visual layouts, interaction states, and component hierarchy MUST replicate or elevate the reference designs in `../mockup/`. Workspace code MUST reference canonical external assets rather than duplicating them.

### III. Type-Safe Data Architecture & Domain Integrity
Data models, schema definitions, and API contracts MUST maintain strict end-to-end TypeScript safety. Database interactions via Prisma and Supabase (PostgreSQL, SSR auth, RLS) MUST strictly validate schemas, relationships, and transaction integrity. Core domain entities—such as motorcycle parts compatibility, multi-tier pricing, inventory adjustments, and service work orders—MUST be explicitly typed with zero tolerance for `any` types.

### IV. Test-First Quality & Contract Verification
Critical business calculations (fitment matching, invoice totals, wholesale discount application, labor charge rules, and inventory decrement logic) MUST be covered by automated unit and integration tests. Pull requests modifying shared contracts or database models MUST verify backward compatibility and include regression test coverage before merging.

### V. Server-First Performance & Accessibility Standards
The application MUST follow modern Next.js App Router architectural standards, leveraging Server Components by default and confining `"use client"` boundaries strictly to interactive leaves. All interactive components and workflows MUST satisfy WCAG AA accessibility standards, including semantic HTML structure, keyboard navigation, descriptive ARIA attributes, and accessible contrast ratios across both Admin and Staff portals.

## Technical Constraints & Stack Standards

- **Framework**: Next.js (App Router) with React 19, TypeScript 5, and Tailwind CSS v4.
- **Database & Auth**: PostgreSQL managed via Prisma ORM and Supabase (SSR client, Row Level Security, session management).
- **Portal Isolation**: Strict boundary separation between Admin Portal (analytics, inventory management, supplier relations, employee administration) and Staff Portal (Fast-Lane POS, shelf locator, barcode checker, punch clock).
- **Iconography & Visuals**: Standardized on `lucide-react` icons and curated asset pipelines; no placeholder text or broken imagery.

## Development Workflow & Quality Gates

- **Atomic Commits**: Code modifications MUST be structured into atomic, single-purpose commits adhering to Conventional Commits format, linked to relevant Jira issue keys when applicable.
- **Verification Gates**: Every branch MUST pass static analysis (`npm run lint`), TypeScript verification (`tsc --noEmit`), and Prisma schema validation (`npx prisma validate`) prior to PR creation or merging.
- **Review Compliance**: Pull requests MUST be checked against the core principles outlined in this Constitution, specifically verifying design token usage, route adherence, and domain rule accuracy.

## Governance

This Constitution represents the supreme architectural and quality standard for the SWIFT project and supersedes any unratified ad-hoc practices. All pull requests, code reviews, and architectural changes MUST verify compliance with these principles.

Amendments to this Constitution require documentation of rationale, consensus approval, and a semantic version update:
- **MAJOR** version increments: Backward-incompatible governance changes, principle removals, or fundamental architectural redefinitions.
- **MINOR** version increments: Addition of new principles, sections, or materially expanded operational guidelines.
- **PATCH** version increments: Non-semantic refinements, typographical fixes, or wording clarifications.

**Version**: 1.0.0 | **Ratified**: 2026-10-06 | **Last Amended**: 2026-10-06
