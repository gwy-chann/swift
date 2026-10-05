# Graph Report - swift  (2026-10-06)

## Corpus Check
- 216 files · ~94,491 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 2, .ico 1, .css 1)

## Summary
- 312 nodes · 129 edges · 207 communities (10 shown, 197 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- React & UI Components
- Database & Supabase Auth
- Module Group 2
- Database & Supabase Auth
- Database & Supabase Auth
- Product Management Skills
- Database & Supabase Auth
- Module Group 7
- React & UI Components
- Database & Supabase Auth
- Module Group 10

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `ThemeToggle()` - 6 edges
3. `scripts` - 6 edges
4. `next` - 6 edges
5. `@supabase/ssr` - 4 edges
6. `parse_args()` - 3 edges
7. `main()` - 3 edges
8. `updateSession()` - 3 edges
9. `normalize()` - 2 edges
10. `applyTheme()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `middleware()` --calls--> `updateSession()`  [EXTRACTED]
  middleware.ts → lib/supabase/middleware.ts

## Import Cycles
- None detected.

## Communities (207 total, 197 thin omitted)

### Community 0 - "React & UI Components"
Cohesion: 0.15
Nodes (15): applyTheme(), getServerSnapshot(), getSnapshot(), subscribe(), ThemeToggle(), BRAND, ColorTokens, darkTokens (+7 more)

### Community 1 - "Database & Supabase Auth"
Cohesion: 0.11
Nodes (17): eslintConfig, name, private, version, ref_dotenv, eslint, eslint-config-next, lucide-react (+9 more)

### Community 2 - "Module Group 2"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 3 - "Database & Supabase Auth"
Cohesion: 0.19
Nodes (7): IMPORTANT: Do not run any logic between createServerClient and, updateSession(), config, middleware(), nextConfig, next, @supabase/ssr

### Community 4 - "Database & Supabase Auth"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss, @types/node, @types/react (+2 more)

### Community 5 - "Product Management Skills"
Cohesion: 0.32
Nodes (7): main(), normalize(), parse_args(), Generate a user story Markdown snippet from CLI inputs. No network access.…, argparse, Namespace, sys

### Community 6 - "Database & Supabase Auth"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react, next, @prisma/client, react, react-dom, @supabase/ssr, @supabase/supabase-js

### Community 7 - "Module Group 7"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, postinstall, start

### Community 8 - "React & UI Components"
Cohesion: 0.40
Nodes (3): app_globals, inter, metadata

### Community 9 - "Database & Supabase Auth"
Cohesion: 0.50
Nodes (3): globalForPrisma, prisma, @prisma/client

## Knowledge Gaps
- **64 isolated node(s):** `inter`, `metadata`, `eslintConfig`, `globalForPrisma`, `prisma` (+59 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 273 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **197 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `React & UI Components` to `Database & Supabase Auth`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `next` connect `Database & Supabase Auth` to `React & UI Components`, `Database & Supabase Auth`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Database & Supabase Auth` to `Database & Supabase Auth`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `ThemeToggle()` (e.g. with `getServerSnapshot()` and `getSnapshot()`) actually correct?**
  _`ThemeToggle()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `inter`, `metadata`, `eslintConfig` to the rest of the system?**
  _64 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React & UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._
- **Should `Database & Supabase Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._