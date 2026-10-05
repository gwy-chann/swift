---
name: graphify-trigger
description: >-
  Determines when and how to trigger Graphify builds, queries, paths, and explanations
  based on user intent, architecture discovery, refactoring impact analysis, and code changes.
---

# Graphify Trigger & Usage Strategy Skill

This skill defines the rules, trigger points, and best practices for leveraging **Graphify** knowledge graphs to understand, navigate, and analyze the codebase.

---

## 🎯 When to Trigger Graphify

### 1. Architecture & Exploration Queries (Use `graphify query`)
When the user asks broad, exploratory, or relational questions:
- *"How is auth structured in this project?"*
- *"Trace the lifecycle of a request through middleware."*
- *"What are the core abstractions / main modules?"*
- *"How do components communicate with the database?"*

👉 **Action**:
1. Check if `graphify-out/graph.json` exists.
2. If it exists, immediately query: `graphify query "<user question>"` (or read [graphify-out/GRAPH_REPORT.md](file:///c:/Users/Roselle%20Tabuena/workspace/swift/swift/graphify-out/GRAPH_REPORT.md)).
3. If not built yet, run `/graphify .` first.

---

### 2. Dependency & Impact Analysis (Use `graphify path` & `explain`)
Before making large-scale refactors or deleting core modules:
- *"What will break if I modify or rename X?"*
- *"What is the connection between Component A and Service B?"*
- *"What are the God Nodes (most connected modules) in the system?"*

👉 **Action**:
- **Find path between two concepts**: `graphify path "<SourceNode>" "<TargetNode>"`
- **Deep-dive on a specific node**: `graphify explain "<NodeName>"`
- Inspect `graphify-out/GRAPH_REPORT.md` under **God Nodes** and **Surprising Connections**.

---

### 3. Graph Rebuild / Update Triggers (Use `/graphify .` or `--update`)
Rebuild or update the knowledge graph when:
- Multiple new files/modules have been added (e.g., new API routes, services, database models).
- Major architectural changes or migrations occurred.
- New third-party libraries or integrations (e.g., Supabase, Prisma) were introduced.

👉 **Action**:
- Fast incremental update: `/graphify . --update`
- Fresh full extraction: `/graphify .`

---

## 🚫 When NOT to Trigger Graphify

Do **not** trigger a graph build or query when:
- Fixing a simple typo, syntax error, or 1-line bug in a single file.
- Running routine formatting (`prettier` / `eslint`).
- Editing isolated styling (e.g. tweaking CSS or Tailwind classes).
- Asking basic generic language/framework syntax questions (e.g., *"How do I map an array in TS?"*).

---

## 🧭 Decision Matrix

| User Intent / Scenario | Recommended Action | Tool / Command |
| :--- | :--- | :--- |
| **New to codebase / Onboarding** | Review full graph & report | Inspect `GRAPH_REPORT.md` or open `graph.html` |
| **"How does X work?"** | Semantic search across graph | `graphify query "How does X work?"` |
| **"How is X connected to Y?"** | Shortest path analysis | `graphify path "X" "Y"` |
| **"Explain module X"** | Single node breakdown | `graphify explain "X"` |
| **Major feature branch merged** | Refresh graph cache | `/graphify . --update` |

---

## 💡 Best Practices for Agents

1. **Prioritize Existing Graph**: Always check `graphify-out/graph.json` before running expensive filesystem greps across large repos.
2. **Surface God Nodes**: When refactoring, warn the user if a target file is listed in the top God Nodes in `GRAPH_REPORT.md`.
3. **Keep Visualizer Accessible**: Point users to [graphify-out/graph.html](file:///c:/Users/Roselle%20Tabuena/workspace/swift/swift/graphify-out/graph.html) when they ask for a visual architecture overview.
