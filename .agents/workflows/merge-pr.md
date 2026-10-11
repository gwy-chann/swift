---
description: Verify PR merge, automatically transition Jira issue to Done, post closure comment, sync main, and update knowledge graph
---

# Workflow: merge-pr

Complete the post-merge phase of the feature lifecycle by synchronizing Jira, updating local `main`, and refreshing AST architecture maps.

## Instructions

1. If arguments are provided (`$ARGUMENTS`), treat them as the PR number or Jira issue key.
2. If no arguments are provided, inspect the current branch's PR status using `gh pr view --json number,title,state,headRefName,url`.
3. Activate and execute the **`merge-pr`** skill ([SKILL.md](file:///c:/Users/Roselle%20Tabuena/workspace/swift/swift/.agents/skills/merge-pr/SKILL.md)).
4. Steps:
   - **Step 1**: Confirm the PR is merged into `main` (or run `gh pr merge <PR#> --merge`).
   - **Step 2**: Extract the linked Jira key (`[SIAA-XX]`).
   - **Step 3**: Automatically transition Jira issue to **Done** via Atlassian MCP `transitionJiraIssue`.
   - **Step 4**: Post closure comment to Jira issue via `addOrEditJiraIssueComment`.
   - **Step 5**: Switch to `main` and pull latest changes (`git checkout main && git pull origin main`).
   - **Step 6**: Resync knowledge graph via `graphify . --update`.
   - **Step 7**: Safely delete the merged feature branch.
