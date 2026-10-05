---
name: atomic-commit
description: >-
  Guides the creation of small, focused, single-purpose git commits (atomic commits)
  following Conventional Commits, staging verification, and clean commit history practices.
---

# Atomic Commit Skill

An **atomic commit** represents a single, complete, and indivisible unit of change. Each commit should do one thing, do it well, and keep the repository in a working state (builds and passes tests).

---

## Core Principles

1. **Single Responsibility**: One logical task per commit (e.g., separate bug fixes from refactoring or feature additions).
2. **Always Buildable**: Every commit in git history must build without breaking tests or linting. Never commit broken intermediate states.
3. **Reversible & Bisectable**: Any commit should be safe to `git revert` or `git cherry-pick` without unintended side-effects on unrelated features.
4. **Descriptive & Conventional**: Commit messages follow the Conventional Commits specification with clear reasoning.

---

## Step-by-Step Workflow

### 1. Inspect Working Tree
Review all modified and untracked files:
```bash
git status
git diff
```

### 2. Group Changes into Logical Units
Do not blindly run `git add .` or `git commit -am`. Group files by their logical concern:
- **Separate Refactoring from Features**: If you cleaned up code before adding a new feature, commit the refactor first.
- **Separate Formatting/Linting**: Code style and formatting fixes should be isolated.
- **Separate Dependency Updates**: Lockfile and package manifest changes should have their own commit.
- **Partial Staging**: Use `git add -p <file>` if a single file contains changes belonging to multiple logical units.

### 3. Validate Before Committing
Verify that the staged changes do not break the application:
```bash
# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Test (if tests exist)
npm test
```

### 4. Craft Conventional Commit Message
Format:
```text
<type>(<scope>): <short imperative summary>

[optional body explaining WHY this change was made and any context]

[optional footer(s): e.g., Closes #123, BREAKING CHANGE: ...]
```

#### Commit Types:
- `feat`: A new user-facing feature or capability
- `fix`: A bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `style`: Formatting, missing semi-colons, white-space changes (no production code change)
- `docs`: Documentation only changes
- `test`: Adding or correcting tests
- `chore`: Maintenance, updating build tasks, package manager configs, tooling

#### Good Summary Rules:
- Use imperative, present tense: `"add feature"` not `"added feature"` or `"adds feature"`.
- Do not capitalize the first letter of the subject after the colon.
- Do not end the subject line with a period.
- Limit the first line to 50-72 characters.

---

## Examples

### ❌ Anti-Patterns (Bad Commits)
- `git commit -m "fixed bugs and updated ui and bumped packages"` (Mixed concerns)
- `git commit -m "wip"` or `git commit -m "part 2"` (Broken/incomplete history)
- `git commit -m "fix stuff"` (Vague, lacks context)

### ✅ Good Atomic Commit Series
```text
refactor(auth): extract token refresh logic into standalone helper
feat(auth): implement Supabase session middleware handler
test(auth): add unit test for token refresh expiration
docs(auth): document local environment setup instructions
```

---

## Execution Checklist for Agents

When preparing atomic commits:
- [ ] Run `git status` to identify all changed files.
- [ ] Split changes into separate, logical chunks.
- [ ] Stage only the files/hunks relevant to chunk 1: `git add <file1> <file2>`.
- [ ] Verify build/types pass for the staged chunk.
- [ ] Commit with conventional message: `git commit -m "type(scope): summary"`.
- [ ] Repeat for remaining changes until the working tree is clean.
