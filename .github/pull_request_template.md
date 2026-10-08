## 🎫 Jira Ticket
- **Jira Issue**: [SWIFT-XXX](https://your-domain.atlassian.net/browse/SWIFT-XXX)
- **Type**: Feature | Bugfix | Refactor | Chore | Hotfix

---

## 📌 Summary
<!-- Provide a concise 2–3 sentence overview of what this PR accomplishes and why -->

---

## 🛠️ Changes Included

### Added
- 

### Changed / Updated
- 

### Fixed / Removed
- 

---

## 🏛️ Architectural & Knowledge Graph Impact
- **Modules / Subsystems Affected**: 
- **Import Cycles**: None introduced (verified via Graphify)
- **Knowledge Graph**: Updated via `/graphify . --update`

---

## 📸 Visuals (UI / UX Changes Only)
<!-- Attach screenshots, GIFs, or WebP recordings if frontend or visual elements were changed -->

| Before | After |
| :---: | :---: |
| | |

---

## 🧪 How to Test & Verify

1. **Checkout & Install Dependencies**:
   ```bash
   git checkout <branch-name>
   npm install
   ```
2. **Environment & Service Setup**:
   ```bash
   npx supabase status
   ```
3. **Test Scenarios**:
   - 

---

## ✅ Pre-Merge Checklist

- [ ] **Jira Linked**: Title and description reference the correct `SWIFT-XXX` ticket.
- [ ] **Rebased**: Branch is cleanly rebased onto the latest target branch (`main` or `develop`) with no merge commits.
- [ ] **Typecheck**: `npx tsc --noEmit` passes with 0 errors.
- [ ] **Linting**: `npm run lint` passes without warnings/errors.
- [ ] **Tests**: `npm test` passes (or new tests added).
- [ ] **Knowledge Graph**: Graphify ran cleanly (`/graphify . --update`) with no circular dependencies.
- [ ] **Secrets Audit**: No sensitive tokens, `.env.local`, or credentials committed.
- [ ] **Diff Reviewed**: Self-reviewed the diff against `main`.
