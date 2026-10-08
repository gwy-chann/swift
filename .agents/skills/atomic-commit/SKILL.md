---
name: atomic-commit
description: >-
  Guides the creation of small, focused, single-purpose git commits (atomic commits)
  following Conventional Commits with mandatory Jira ticket traceability, layer-by-layer
  architectural decomposition, detailed diff-based descriptions, and clean commit history.
---

# Atomic Commit Skill

An **atomic commit** represents a single, complete, and indivisible unit of change. Each commit should do one thing, do it exceptionally well, maintain a clean compilable state (`npx tsc --noEmit` and `npm run lint` passing), and provide an informative, diff-derived description linked to the active Jira issue.

---

## 🏛️ Core Principles

1. **Single Responsibility**: One architectural concern per commit (e.g., separate specifications, tooling/configs, core business logic, UI components, and test suites).
2. **Mandatory Jira Traceability**: Every commit on a feature or bugfix branch MUST reference the active Jira ticket key (e.g., `[SIAA-13]`, `[SWIFT-101]`). If no Jira ticket exists, use `[NO-JIRA]`.
3. **Diff-Accurate Descriptions**: Commit summaries and bodies must describe the *actual code artifacts* created or modified (exact component names, store functions, schemas, or test files), not vague placeholders.
4. **Always Buildable**: Every intermediate commit in git history must compile cleanly without breaking tests or linting. Never commit a broken intermediate state.
5. **Reversible & Bisectable**: Any commit must be safe to `git revert` or `git cherry-pick` without cascading breakages across unrelated modules.

---

## 🏷️ Commit Message Standard

### Header Format (Mandatory)
```text
<type>(<scope>): [<JIRA-KEY>] <concise imperative summary>
```

- **`<type>`**: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `style`
- **`<scope>`**: Subsystem or module affected (`inventory`, `pos`, `auth`, `specs`, `tooling`, `db`, `ui`, `theme`)
- **`[<JIRA-KEY>]`**: The exact uppercase Jira issue key extracted from the branch or ticket context (e.g. `[SIAA-13]`)
- **`<summary>`**: Imperative, lowercase summary (under 72 chars), no trailing period (e.g., `add catalog filtering engine, stock health predicates, and unit tests`)

### Optional Multi-Line Body (For Multi-File or Non-Trivial Commits)
When a commit modifies or introduces multiple related components or functions, include a bulleted description derived directly from `git diff --staged`:

```text
feat(inventory): [SIAA-13] implement master parts catalog grid, multi-attribute filter bar, and KPI cards

- Create InventoryStatsCards component displaying 4 overview KPI metrics (SKUs, warnings, valuation, health)
- Create CatalogFilterBar with real-time text search, category dropdown, and stock status filters
- Create responsive CatalogTable with semantic stock health badges, OEM tags, and shelf locator tags
- Integrate InventoryCatalog container with useInventoryStore and replace placeholder in /admin/inventory
```

---

## 📦 Canonical Layer-by-Layer Decomposition

Never bundle an entire feature into a single "mega-commit" (`git add .`). Always decompose changes into this sequential order:

```mermaid
flowchart TD
    A[Unit 1: Specs & Design Artifacts\ndocs(specs): [JIRA] add spec, plan, contracts, tasks] --> B[Unit 2: Tooling & Configurations\nchore(tooling): configure test runner, tsconfig, deps]
    B --> C[Unit 3: Database & Domain Models\nfeat(db): [JIRA] add prisma schemas, supabase migrations]
    C --> D[Unit 4: Core Engine, Business Logic & Tests\nfeat(core): [JIRA] add filter predicates, pure helpers, and unit tests]
    D --> E[Unit 5: UI Presentation & Page Views\nfeat(ui): [JIRA] implement components and assemble route view]
    E --> F[Unit 6: Task Completion & Sync\ndocs(specs): [JIRA] mark all implementation tasks complete]
```

### 1. Unit 1: Specification & Planning Artifacts
Stage: `specs/<feature>/` (spec.md, research.md, data-model.md, contracts/, checklists/, plan.md, quickstart.md, tasks.md)
```bash
git add specs/<feature-dir>
git commit -m "docs(specs): [<JIRA-KEY>] add specification, research, plan, contracts, and tasks for <feature-name>"
```

### 2. Unit 2: Dependencies, Tooling & Build Configs
Stage: `package.json`, `tsconfig.json`, `eslint.config.mjs`, build scripts
```bash
git add package.json tsconfig.json
git commit -m "chore(tooling): configure <tool/dependency update description>"
```

### 3. Unit 3: Database Schemas & Migrations
Stage: `prisma/schema.prisma`, `supabase/migrations/`, `supabase/seed.sql`
```bash
git add prisma/ supabase/
git commit -m "feat(db): [<JIRA-KEY>] implement database schema migrations and seed records"
```

### 4. Unit 4: Domain Models, Business Logic, Stores & Unit Tests (TDD)
Stage: `lib/`, `contracts/`, `__tests__/`
```bash
git add lib/<module>/
git commit -m "feat(<module>): [<JIRA-KEY>] add <engine/predicate/store> logic and unit test suite"
```

### 5. Unit 5: UI Components, Layouts & Route Integration
Stage: `components/<module>/`, `app/<route>/`
```bash
git add components/<module>/ app/<route>/
git commit -m "feat(<module>): [<JIRA-KEY>] implement <component-names> and assemble <route> page"
```

### 6. Unit 6: Tasks Completion & Governance Sync
Stage: `specs/<feature>/tasks.md`
```bash
git add specs/<feature>/tasks.md
git commit -m "docs(specs): [<JIRA-KEY>] mark all implementation tasks complete"
```

---

## 🔄 Step-by-Step Execution Workflow for Agents

### Step 1: Detect Active Jira Key
1. Check current branch: `git branch --show-current`
2. Extract the Jira ticket key (e.g. `feat/SIAA-13-...` ➔ `SIAA-13`).
3. If no key is in the branch name, check active conversation context or fall back to `NO-JIRA`.

### Step 2: Inspect Staged & Unstaged Diff
```bash
git status -s
git diff
```
Identify which files belong to which architectural layer (Specs ➔ Tooling ➔ Schema ➔ Core Logic ➔ UI ➔ Tasks).

### Step 3: Stage Single Concern & Verify Build
```bash
git add <specific-files-for-unit>
npx tsc --noEmit
npm run lint
```
Ensure intermediate state compiles cleanly before committing.

### Step 4: Commit with Precise Descriptive Message
Formulate the commit message matching the Conventional Commit + Jira standard. Mention actual components, types, or utilities introduced.

### Step 5: Repeat Until Working Tree is Clean
Iterate through remaining layers until `git status` reports `nothing to commit, working tree clean`.

### Step 6: Automatically Prepare PR Description
Once all atomic commits are committed and pushed:
1. Run `git log origin/main..HEAD --oneline` to inspect the full commit series.
2. Synthesize the changes into the standard PR template (`.github/pull_request_template.md`).
3. If GitHub CLI (`gh`) or API credentials are available, apply the PR title and description directly to GitHub, or provide the complete markdown directly to the user.

---

## 📋 Execution Checklist for Agents

When preparing atomic commits:
- [ ] Active Jira key identified and verified (e.g. `SIAA-13`).
- [ ] Changes decomposed into logical architectural units (Specs, Tooling, Core Logic, UI, Tasks).
- [ ] No mixed commits (spec files separated from UI code; config changes separated from business logic).
- [ ] Each commit verified for compilation and linting (`npx tsc --noEmit`).
- [ ] Commit headers strictly formatted: `<type>(<scope>): [<JIRA-KEY>] <imperative summary>`.
- [ ] Meaningful bullet points added for multi-file commits detailing exact files and functions.
- [ ] Working tree confirmed clean: `git status` shows 0 uncommitted changes.
