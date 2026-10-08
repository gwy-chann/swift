---
name: create-pr
description: >-
  Guides the end-to-end workflow for creating high-quality Pull Requests (PRs),
  including mandatory base branch rebase, Jira-linked title and description standards, pre-flight verification,
  Graphify architectural impact analysis, structured PR templates, and GitHub CLI (gh) automation.
---

# Pull Request (PR) Creation Skill

This skill defines the mandatory standards, templates, and workflows for preparing, describing, rebasing, and opening clean, review-ready Pull Requests linked to Jira tickets. All PR branches must strictly be rebased onto the target base branch (`main` or `develop`) prior to opening or updating.

---

## 🏷️ PR Title Standards

Every Pull Request title must follow a standardized format linking Conventional Commits with the Jira ticket key:

```text
<type>(<scope>): [<JIRA-KEY>] <concise imperative description>
```

### Component Breakdown

| Component | Format | Rules & Constraints |
| :--- | :--- | :--- |
| `<type>` | Lowercase | Standard Conventional Commit type: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `hotfix`. |
| `(<scope>)` | Optional, Lowercase | Area of codebase touched (e.g. `(auth)`, `(db)`, `(ui)`, `(api)`, `(deps)`). |
| `[<JIRA-KEY>]` | Uppercase brackets | Exact Jira issue key (e.g. `[SWIFT-101]`, `[AUTH-42]`). Use `[NO-JIRA]` only for unticketed maintenance. |
| `<description>` | Imperative present tense | Start with lowercase letter, no trailing period, max 72 characters total. (e.g., `integrate Supabase session middleware`). |

---

### PR Title Examples

| Type | Example Title |
| :--- | :--- |
| **Feature** | `feat(auth): [SWIFT-101] implement Supabase session middleware and auth cookies` |
| **Bug Fix** | `fix(db): [SWIFT-204] resolve PrismaClient missing export in client initialization` |
| **Refactor** | `refactor(tokens): [SWIFT-305] streamline token refresh and validation logic` |
| **Chore** | `chore(deps): [SWIFT-412] upgrade Tailwind CSS and PostCSS configuration` |
| **Hotfix** | `hotfix(session): [SWIFT-999] invalidate leaked session tokens immediately` |

---

## 📝 Standard PR Description Template

Every PR description must use the following standard template. Copy and fill out all relevant sections before opening the PR.

```markdown
## 🎫 Jira Ticket
- **Jira Issue**: [SWIFT-XXX](https://your-domain.atlassian.net/browse/SWIFT-XXX)
- **Type**: Feature | Bugfix | Refactor | Chore | Hotfix

---

## 📌 Summary
A concise 2–3 sentence overview of what this PR accomplishes, the business or technical motivation, and the core approach taken.

---

## 🛠️ Changes Included

### Added
- Feature / component / endpoint 1
- Feature / component / endpoint 2

### Changed / Updated
- Modified behavior or refactored component 1

### Fixed / Removed
- Bug fixed or deprecated code removed

---

## 🏛️ Architectural & Knowledge Graph Impact
- **Modules / Subsystems Affected**: `lib/supabase`, `middleware.ts`, `prisma/`
- **Import Cycles**: None introduced (verified via Graphify)
- **Knowledge Graph**: Updated via `/graphify . --update` ([GRAPH_REPORT.md](file:///path/to/graphify-out/GRAPH_REPORT.md))

---

## 📸 Visuals (UI / UX Changes Only)
*(Include screenshots, GIFs, or WebP recordings if frontend or visual elements were changed)*

| Before | After |
| :---: | :---: |
| *(Image / Screenshot)* | *(Image / Screenshot)* |

---

## 🧪 How to Test & Verify

1. **Checkout & Install Dependencies**:
   ```bash
   git checkout <branch-name>
   npm install
   ```
2. **Environment & Service Setup**:
   - Ensure local Supabase is running: `npx supabase status`
   - Run database migrations: `npx prisma db push` (or `migrate dev`)
3. **Step-by-Step Test Scenarios**:
   - Navigate to `http://localhost:3000/login`
   - Perform action X and verify expectation Y.
   - Verify logs / network tab for expected output Z.

---

## ✅ Pre-Merge Checklist

- [ ] **Jira Linked**: Title and description reference the correct `SWIFT-XXX` ticket.
- [ ] **Rebased**: Branch is cleanly rebased onto the latest target branch (`main` or `develop`) with no merge commits.
- [ ] **Typecheck**: `npx tsc --noEmit` passes with 0 errors.
- [ ] **Linting**: `npm run lint` passes without warnings/errors.
- [ ] **Tests**: `npm test` passes (or new tests added).
- [ ] **Knowledge Graph**: Graphify ran cleanly (`/graphify . --update`) with no circular dependencies.
- [ ] **Secrets Audit**: No sensitive tokens, `.env.local`, or credentials committed.
- [ ] **Diff Reviewed**: Self-reviewed the diff against `main`.
```

---

## 📋 Pre-Flight Verification Workflow

Before running `gh pr create`:

### 1. Mandatory Branch Rebase (Never Merge)
Always rebase your branch directly onto the latest target branch (`origin/main` or `origin/develop`). **Never use `git merge`** to update feature branches from upstream — maintain a clean, linear git history with zero merge commits:

```bash
# Fetch latest remote changes
git fetch origin

# Rebase onto the base target branch (e.g. main)
git rebase origin/main

# If conflicts arise:
# 1. Resolve conflicts in the affected files
# 2. Stage resolved files: git add <files>
# 3. Continue rebase: git rebase --continue
# (Do NOT run git commit or git merge)
```

### 2. Code Quality & Type Safety Checks
Verify that the codebase compiles and passes linting:
```bash
# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Test (if applicable)
npm test
```

### 3. 🧠 Graphify Knowledge Graph Check (Mandatory)
Update and inspect the codebase graph:
```bash
/graphify . --update
```
- Verify **Import Cycles: None detected** in `graphify-out/GRAPH_REPORT.md`.
- Ensure new files are connected to the dependency graph.

### 4. Diff & Secrets Audit
Audit all committed changes:
```bash
# Review commit log
git log origin/main..HEAD --oneline

# Review full diff
git diff origin/main..HEAD
```

---

## 🚀 Opening the PR with GitHub CLI (`gh`)

### 1. Push Branch
Push the rebased branch to remote. If the branch was previously pushed or rebased against upstream, use `--force-with-lease` to safely update remote history:
```bash
git push -u origin <branch-name> --force-with-lease
```

### 2. Create the PR Using Template

#### Option A: Interactive (Recommended)
```bash
gh pr create
```

#### Option B: Automated via Body File
```bash
gh pr create \
  --base main \
  --head feat/SWIFT-101-supabase-auth-flow \
  --title "feat(auth): [SWIFT-101] implement Supabase session middleware" \
  --body-file .github/pull_request_template.md
```

#### Option C: Draft Mode (Work In Progress)
```bash
gh pr create --draft \
  --title "feat(auth): [SWIFT-101] [WIP] implement Supabase session middleware" \
  --body "Work in progress. Do not merge yet."
```
