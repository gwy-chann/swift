---
name: create-branch
description: >-
  Standardizes git branch creation and lifecycle management with structured naming conventions
  directly linked to Jira ticket IDs, base branch synchronization, and Jira issue tracking workflows.
---

# Git Branch Creation & Management Skill

This skill defines the standard workflow and naming conventions for creating organized, traceable git branches linked to Jira tickets.

---

## 🏷️ Branch Naming Standard

Every feature, bugfix, refactor, or chore branch must follow a strictly structured naming convention:

```text
<type>/<JIRA-KEY>-<kebab-case-description>
```

### Component Breakdown

| Component | Format | Description & Rules |
| :--- | :--- | :--- |
| `<type>` | Lowercase | Standard prefix matching the nature of the change (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `hotfix`). |
| `<JIRA-KEY>` | Uppercase (`PROJECT-123`) | The exact Jira issue key (e.g., `SWIFT-101`, `AUTH-42`). Ensures bi-directional traceability with Jira boards. |
| `<kebab-case-description>` | Lowercase, hyphen-separated | 2–5 words summarizing the feature or fix. Omit filler words (a, the, for). |

---

### Type Categories & Examples

| Category | Purpose | Example Branch Name |
| :--- | :--- | :--- |
| `feat` | New feature or capability | `feat/SWIFT-101-supabase-auth-integration` |
| `fix` | Bug fix or error resolution | `fix/SWIFT-204-prisma-client-export-error` |
| `refactor` | Code improvement without behavior change | `refactor/SWIFT-305-token-refresh-logic` |
| `chore` | Tooling, dependencies, build configs | `chore/SWIFT-412-upgrade-tailwind-postcss` |
| `docs` | Documentation only updates | `docs/SWIFT-510-setup-guide` |
| `test` | Adding, updating, or fixing tests | `test/SWIFT-615-auth-middleware-tests` |
| `perf` | Performance optimizations | `perf/SWIFT-720-optimize-query-caching` |
| `hotfix` | Urgent production patch off `main` | `hotfix/SWIFT-999-critical-session-leak` |

> [!NOTE]
> If a task does not have a Jira ticket (e.g., emergency local spike or unassigned chore), create a Jira ticket first, or use `NO-JIRA` as a fallback: `chore/NO-JIRA-update-readme`.

---

## 🚫 Naming Anti-Patterns vs. ✅ Best Practices

| ❌ Invalid Branch Name | Reason | ✅ Corrected Standard |
| :--- | :--- | :--- |
| `fix-prisma-bug` | Missing type prefix and Jira ticket | `fix/SWIFT-204-prisma-client-export-error` |
| `roselle/auth-work` | User-based prefix instead of conventional type | `feat/SWIFT-101-supabase-auth-flow` |
| `FEAT/swift-101-auth` | Inconsistent uppercase type and lowercase Jira key | `feat/SWIFT-101-supabase-auth` |
| `feat/SWIFT-101_user_login` | Underscores instead of hyphens | `feat/SWIFT-101-user-login` |
| `fix/SWIFT-204-fix-the-issue-where-prisma-client-fails-to-export-in-lib-prisma` | Excessively long description | `fix/SWIFT-204-prisma-client-export` |

---

## 🔄 Step-by-Step Branch Creation Workflow

### Step 1: Retrieve Jira Ticket Context
Before creating the branch:
1. Verify the Jira issue key, title, and acceptance criteria.
2. If using Jira MCP/CLI, inspect the issue:
   - Tool: `getJiraIssue` (or `searchJiraIssuesUsingJql`)
   - Transition ticket status to **"In Progress"** when starting work.

### Step 2: Clean Working Tree & Sync Base Branch
Never branch off a stale or dirty working directory.

```bash
# 1. Check for uncommitted changes
git status

# 2. Switch to base branch (main or develop)
git checkout main

# 3. Pull the latest upstream changes
git fetch origin
git pull origin main
```

### Step 3: Create & Switch to New Branch
Use `git checkout -b` or `git switch -c`:

```bash
# Example: Creating a feature branch for SWIFT-101
git switch -c feat/SWIFT-101-supabase-auth-integration

# Verify current branch
git branch --show-current
```

### Step 4: Publish & Set Upstream (When Ready)
When pushing the first commit to the remote repository:

```bash
git push -u origin <branch-name>
```

---

## 🔗 Integration with Downstream Skills

Creating structured, Jira-linked branches streamlines downstream workflows:

1. **Atomic Commits (`atomic-commit` skill)**:
   - Commit messages can reference the ticket: `feat(auth): [SWIFT-101] add supabase session provider`.
2. **Pull Requests (`create-pr` skill)**:
   - PR titles auto-include the Jira ticket: `feat(auth): [SWIFT-101] integrate Supabase auth flow`.
   - PR templates link the Jira ticket directly in the **Motivation / Context** section: `Resolves: [SWIFT-101](https://your-domain.atlassian.net/browse/SWIFT-101)`.

---

## 📋 Execution Checklist for Agents & Developers

When asked to create a branch:
- [ ] Obtain or clarify the Jira ticket number (e.g., `SWIFT-123`) and purpose.
- [ ] Determine the appropriate branch type (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `hotfix`).
- [ ] Format kebab-case description (lowercase, 2–5 words, hyphen-separated).
- [ ] Ensure local `main` (or base branch) is synced with `origin/main`.
- [ ] Execute `git switch -c <type>/<JIRA-KEY>-<description>`.
- [ ] Confirm the active branch matches the required naming standard.
