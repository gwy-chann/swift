---
description: Execute the end-to-end SpecKit lifecycle (specify, clarify, checklist, plan, tasks, analyze, implement, converge)
---

# Workflow: speckit

Run the full SpecKit development pipeline for a feature request.

## Instructions

1. If arguments are provided (`$ARGUMENTS`), treat them as the feature title / description.
2. If no arguments are provided, prompt the user for the feature description or pick up the active work in `.specify/specs/`.
3. Activate and execute the `speckit-workflow` skill ([SKILL.md](file:///c:/Users/Roselle%20Tabuena/workspace/swift/swift/.agents/skills/speckit-workflow/SKILL.md)).
4. Follow the progressive phases:
   - **Specify** (`speckit-specify`)
   - **Clarify** (`speckit-clarify`)
   - **Checklist** (`speckit-checklist`)
   - **Plan** (`speckit-plan`)
   - **Tasks** (`speckit-tasks`)
   - **Analyze** (`speckit-analyze`)
   - **Implement** (`speckit-implement`)
   - **Converge & Validate** (`speckit-converge`, `constitution-check`, `graphify-auto-sync`)