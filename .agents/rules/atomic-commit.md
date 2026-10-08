---
trigger: always_on
description: Always enforce atomic commits and Conventional Commits standards whenever committing code.
---

## Atomic Commits Enforcement

Whenever the user asks to commit changes, stage files, or create git commits:

1. **Always apply the atomic-commit skill** (`.agents/skills/atomic-commit/SKILL.md`).
2. **Never execute a single "mega-commit"** (`git add .` / bundling everything together).
3. **Inspect the diff and decompose changes** into logical, single-purpose units (e.g., config/tooling, database schema, API/services, UI, docs).
4. **Follow Conventional Commits** formatting (`feat(...)`, `fix(...)`, `refactor(...)`, `chore(...)`, `test(...)`, `docs(...)`).
5. **Stage and commit each unit separately**, ensuring intermediate states remain compilable and test-passing.
