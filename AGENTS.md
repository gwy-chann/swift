<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SWIFT Project Rules & Context Reference

## 1. Context & Single Source of Truth
Whenever implementing, designing, or refactoring features in this `swift/` Next.js application, always reference the specifications and mockups in the workspace:

- **Features & Architecture Specification**: `../docs/features.md`
  - Authoritative reference for features, business rules, pricing tiers (retail vs. wholesale), motorcycle parts fitment, labor rates, and workflows.
- **Site Map & Page Hierarchy**: `../docs/swift_site_map.md`
  - Authoritative blueprint for App Router page hierarchy, navigation routes (Admin vs. Staff portal), and sub-modules.
- **Interactive UI Mockups**: `../mockup/`
  - `../mockup/admin.html`: Reference layout, UI elements, analytics charts, and modal designs for the Admin Portal.
  - `../mockup/staff.html`: Reference UI for the Staff Portal (Fast-Lane POS, shelf locator, barcode checker, punch clock).
  - `../mockup/style.css`: Design tokens, color system, typography, component styles, and responsiveness rules.
  - `../mockup/app.js`: Data schemas (products, categories, fitment compatibility matrix), reactive state patterns, and simulated business logic.

## 2. Development Guidelines
- **UI Consistency**: Ensure all new Next.js components faithfully replicate or elevate the layouts, styling tokens, and interaction states defined in `../mockup/`.
- **Data & Types**: Derive TypeScript interfaces and mock/database schemas directly from the data structures defined in `../mockup/app.js` and `../docs/features.md`.
- **Route Structure**: Mirror the routes and views specified in `../docs/swift_site_map.md`.
- **Reference Over Duplication**: Do NOT duplicate or copy files from `docs/` and `mockup/` into `swift/`; reference them from `../docs` and `../mockup`.

## 3. Mandatory Color Tokens Rule
**All UI colors in the application MUST strictly be based on the established SWIFT design tokens.**

- **Single Source of Truth for Colors**:
  - CSS Variables & Tailwind v4 Theme: [`app/globals.css`](file:///c:/Users/Roselle%20Tabuena/workspace/swift/swift/app/globals.css)
  - TypeScript Constants & Theme Engine: [`lib/tokens.ts`](file:///c:/Users/Roselle%20Tabuena/workspace/swift/swift/lib/tokens.ts)
- **Zero Hardcoded Colors**:
  - **NEVER** use arbitrary ad-hoc hex/rgb values (e.g., `#2563eb`, `#111827`, `rgb(...)`) or default non-token Tailwind palette classes (e.g., `text-gray-900`, `bg-blue-600`, `bg-slate-100`).
  - **ALWAYS** use the semantic design token utility classes or CSS variables:
    - **Surfaces & Backgrounds**: `bg-bg-base`, `bg-bg-surface`, `bg-bg-card`, `bg-bg-sidebar`, `bg-bg-input`, `bg-bg-hover`, `bg-bg-muted`
    - **Text Colors**: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-light`
    - **Brand & Action**: `bg-primary`, `text-primary`, `border-primary`, `bg-primary-hover`, `bg-primary-light`, `border-primary-border`
    - **Secondary & Tool**: `bg-secondary`, `text-secondary`, `bg-secondary-hover`
    - **Status Accents**: `bg-success`/`text-success`, `bg-accent`/`text-accent`, `bg-danger`/`text-danger`, `bg-info`/`text-info` (and their `-light` variants)
    - **Borders**: `border-border`, `border-border-subtle`, `border-border-focus`
- **Light & Dark Mode Harmony**:
  - The default theme is Light Mode.
  - Relying on semantic tokens guarantees that dark mode (`.dark` / `[data-theme="dark"]`) functions seamlessly without requiring scattered, manual `dark:` utility overrides.
- **Charts, Canvas & Programmatic Styling**:
  - When rendering data visualizations, charts, badges, or canvas elements in TypeScript, import tokens from `@/lib/tokens` (`getThemeTokens(mode)`).

