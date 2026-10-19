# Quickstart & Verification Guide: Staff Terminal Role-Aware Navigation

**Feature**: `085-staff-terminal-role-navigation`  
**Jira Issue**: [SIAA-85](https://the-three-devsketeers.atlassian.net/browse/SIAA-85)  
**Date**: 2026-10-20  

---

## 1. Quick Verification Scenarios

### Scenario A: Mechanic Role Sidebar Verification
1. Navigate to the staff terminal clock page: `http://localhost:3000/staff/clock`.
2. Switch active staff member to **Dante Reyes** (Mechanic).
3. Observe the left sidebar navigation items:
   - ✅ **Punch Clock** (`/staff/clock`) is visible.
   - ✅ **Model Fitment Search / MotoMatcher** (`/staff/compat`) is visible.
   - ✅ **Stock & Shelf Finder** (`/staff/search`) is visible.
   - ❌ **Fast-Lane POS** (`/staff/pos`) is hidden.
   - ❌ **Purchase History** (`/staff/history`) is hidden.
   - ❌ **Item Code Price Check** (`/staff/pricecheck`) is hidden.
4. Verify the sidebar footer displays `Dante Reyes` with role `Mechanic`.

### Scenario B: Inventory Clerk Role Sidebar Verification
1. On `http://localhost:3000/staff/clock`, switch active profile to **Rico Santos** (Inventory Clerk).
2. Observe the left sidebar:
   - ✅ **Punch Clock** (`/staff/clock`) is visible.
   - ✅ **Stock & Shelf Finder** (`/staff/search`) is visible.
   - ✅ **Item Code Price Check** (`/staff/pricecheck`) is visible.
   - ❌ **Fast-Lane POS** (`/staff/pos`) is hidden.
   - ❌ **Purchase History** (`/staff/history`) is hidden.
   - ❌ **Model Fitment Search** (`/staff/compat`) is hidden.
3. Verify the sidebar footer displays `Rico Santos` with role `Inventory Clerk`.

### Scenario C: Direct URL Redirection Guard
1. With **Dante Reyes** (Mechanic) active, manually enter `http://localhost:3000/staff/pos` in the browser address bar.
2. Confirm the page intercepts the visit and redirects to `/staff/compat`.
3. Confirm toast notification appears: *"Redirected: Your profile is scoped to workshop repair tools."*
4. With **Rico Santos** (Inventory Clerk) active, manually enter `http://localhost:3000/staff/pos`.
5. Confirm redirection to `/staff/search` with toast: *"Redirected: Your profile is scoped to inventory management tools."*

---

## 2. Automated Test Suite Execution

Run the targeted test suite inside the worktree:
```bash
npx vitest run __tests__/staff-sidebar-rbac.test.tsx
```
Verify that all test cases for role filtering, direct route redirection, and sidebar component rendering pass with 100% success.
