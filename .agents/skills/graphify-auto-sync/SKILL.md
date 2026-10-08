---
name: graphify-auto-sync
description: Automatically evaluates codebase state and triggers incremental Graphify knowledge graph syncs at feature completion boundaries, schema migrations, and before new architectural planning.
triggers:
  - "Feature branch / user story completed (all tasks in tasks.md checked off)"
  - "Prisma schema or database migration applied"
  - "Before initializing speckit-plan or architectural refactoring"
  - "When 10+ new source files or components have been created or moved"
---

# Graphify Auto-Sync Skill

## Purpose

Maintain an up-to-date Abstract Syntax Tree (AST) and component dependency graph in `graphify-out/` without manual reminders or developer overhead.

---

## 🎯 When to Auto-Trigger Sync

The agent must automatically evaluate and execute this skill under the following conditions:

1. **Feature Completion Boundary**:
   - All tasks in `specs/<feature>/tasks.md` are marked complete (`[x]`).
   - Tests have passed and the feature branch is ready for merge/review.
2. **Schema & Data Model Migration**:
   - Any change or migration in `prisma/schema.prisma` or `supabase/migrations/`.
3. **Pre-Planning Phase**:
   - Before generating a new `plan.md` for the next user story or spec, ensure the knowledge graph is synchronized with recent changes.
4. **Substantial Codebase Expansion**:
   - When multiple new routes, hooks, components, or utilities have been added across feature directories.

---

## ⚡ Execution Workflow

### Step 1: Check Existing Graph State

Verify whether `graphify-out/graph.json` exists in the repository root.

### Step 2: Run Incremental Sync (Zero Cost)

Run an incremental AST update on changed and new files:

```bash
graphify . --update
```

_(Note: `--update` runs an AST-only scan on modified/added files, requiring zero external API tokens or LLM cost)._

If running a full structural refresh after a major directory rebrand or re-organization:

```bash
graphify .
```

### Step 3: Verify Output Artifacts

Confirm the updated artifacts exist and reflect recent source files:

- `graphify-out/graph.json` (Knowledge graph payload)
- `graphify-out/GRAPH_REPORT.md` (Human-readable architecture summary)
- `graphify-out/index.html` (Interactive visual graph)

### Step 4: Use the Graph for Context

Once synced, leverage the fresh graph for downstream architectural decisions:

- `graphify query "<concept or component>"`
- `graphify path "<SourceComponent>" "<TargetModel>"`
- `graphify explain "<ComponentName>"`

---

## 🛡️ Anti-Patterns (When NOT to Trigger)

- ❌ Do NOT trigger on single-line typo fixes, CSS styling tweaks, or minor text changes.
- ❌ Do NOT trigger in the middle of active task execution before code compiles.
