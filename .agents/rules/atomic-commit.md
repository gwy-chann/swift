---
trigger: always_on
description: Always enforce atomic commits and Conventional Commits standards whenever committing code.
---

## Atomic Commits Enforcement

Whenever the user asks to commit changes, stage files, or create git commits:

1. **Always apply the atomic-commit skill** (`.agents/skills/atomic-commit/SKILL.md`).
2. **Never execute a single "mega-commit"** (`git add .` / bundling everything together).
3. **Mandatory Jira Key Traceability**: Every commit on a feature or fix branch MUST include the ticket key: `<type>(<scope>): [<JIRA-KEY>] <imperative description>`.
4. **Decompose changes into canonical architectural layers**:
   - Unit 1: Specification & Design artifacts (`docs(specs): [<JIRA-KEY>] ...`)
   - Unit 2: Dependencies & Tooling configs (`chore(tooling): ...`)
   - Unit 3: Database Schemas & Migrations (`feat(db): [<JIRA-KEY>] ...`)
   - Unit 4: Domain Models, Business Logic & Tests (`feat(<scope>): [<JIRA-KEY>] ...`)
   - Unit 5: UI Components & Route Views (`feat(<scope>): [<JIRA-KEY>] ...`)
   - Unit 6: Tasks Completion & Sync (`docs(specs): [<JIRA-KEY>] ...`)
5. **Diff-Accurate Descriptions**: Commit messages must specify actual components, functions, or schemas modified/added based on `git diff --staged`.
6. **Stage and commit each unit separately**, ensuring intermediate states remain compilable (`npx tsc --noEmit`) and test-passing.
7. **Automated PR Synthesis**: Once all commits are pushed, automatically synthesize the commit series into the full PR description standard (`.github/pull_request_template.md`).
