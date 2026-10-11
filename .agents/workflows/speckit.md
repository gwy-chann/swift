---
description: Execute the end-to-end SpecKit lifecycle (worktree isolation, specify, clarify, checklist, plan, tasks, analyze, implement, converge)
---

# Workflow: speckit

Run the full SpecKit development pipeline for a feature request.

## Instructions

1. If arguments are provided (`$ARGUMENTS`), treat them as the feature title / description / Jira ticket.
2. If no arguments are provided, prompt the user for the feature description or pick up the active work in `specs/`.
3. **Worktree Isolation (Parallel Feature Guard)**:
   - Verify if the current working directory is already an isolated worktree for this feature.
   - If currently in the repository root or on another branch, provision a dedicated Git worktree off `origin/main`:
     ```bash
     git fetch origin main
     git worktree add .worktrees/<JIRA-KEY-or-slug> -b feat/<JIRA-KEY-or-slug> origin/main
     ```
   - All subsequent phases, commands, edits, and artifact generations MUST execute inside `.worktrees/<JIRA-KEY-or-slug>`.
4. Activate and execute the `speckit-workflow` skill ([SKILL.md](file:///c:/Users/Roselle%20Tabuena/workspace/swift/swift/.agents/skills/speckit-workflow/SKILL.md)).
5. Follow the progressive phases:
   - **Phase 0: Worktree & Branch Provisioning**
   - **Phase 1: Specify** (`speckit-specify`)
   - **Phase 2: Clarify** (`speckit-clarify`)
   - **Phase 3: Checklist** (`speckit-checklist`)
   - **Phase 4: Plan** (`speckit-plan`)
   - **Phase 5: Tasks** (`speckit-tasks`)
   - **Phase 6: Analyze** (`speckit-analyze`)
   - **Phase 7: Implement** (`speckit-implement`)
   - **Phase 8: Converge & Validate** (`speckit-converge`, `constitution-check`, `graphify-auto-sync`)
   - **Phase 9: Pull Request & Worktree Teardown** (`create-pr`, worktree prune)