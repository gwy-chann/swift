# Quickstart: Verifying Baseline Staff Profiles & Two-Step Login

**Feature Branch**: `feat/SIAA-105-auth-seed-baseline-staff-profiles`  
**Created**: 2026-10-26  
**Jira Ticket**: [SIAA-105](https://the-three-devsketeers.atlassian.net/browse/SIAA-105)

---

## 1. Automated Test Execution

Inside the feature worktree (`.worktrees/SIAA-105`), run the automated test suite:

```bash
# Run credentials and PIN verification tests
npm test lib/auth/__tests__/demo-staff-credentials.test.ts

# Run static type checking
npx tsc --noEmit
```

Expected Output:
```text
✔ Demo Staff Accounts & Punch Clock PIN Authorization Matrix > exports all demo staff and admin accounts with complete credentials and PINs
✔ Demo Staff Accounts & Punch Clock PIN Authorization Matrix > maintains backwards compatibility for DEMO_ACCOUNTS record
✔ Demo Staff Accounts & Punch Clock PIN Authorization Matrix > binds valid 4-digit PIN codes matching the punch clock authorization system
✔ Demo Staff Accounts & Punch Clock PIN Authorization Matrix > rejects malformed PIN codes with exact 4-digit constraint
```

---

## 2. Database Seed Validation (Supabase SQL)

When running `supabase/seed.sql` on local Supabase:

```sql
-- Query active baseline staff accounts and PINs
SELECT id, email, full_name, role, status, pin_code
FROM public.profiles
WHERE email IN ('cashier@swift.local', 'mechanic1@swift.local', 'warehouse@swift.local')
ORDER BY role;
```

Expected Result:
| id | email | full_name | role | status | pin_code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `c0000000-0000-0000-0000-000000000002` | `cashier@swift.local` | Mike Morales | cashier | Active | 1234 |
| `d0000000-0000-0000-0000-000000000003` | `mechanic1@swift.local` | Dante Reyes | mechanic | Active | 2222 |
| `d0000000-0000-0000-0000-000000000004` | `warehouse@swift.local` | Rico Santos | inventory_clerk | Active | 3333 |

---

## 3. Manual Interactive UI Walkthrough

1. Open `/login` in your browser.
2. In the **Demo System Accounts** card, observe 4 accounts:
   - **Admin**: Carlos Rodriguez (`admin@swift.local`)
   - **Cashier**: Mike Morales (`cashier@swift.local`)
   - **Mechanic**: Dante Reyes (`mechanic1@swift.local`)
   - **Inventory Clerk**: Rico Santos (`warehouse@swift.local`)
3. Click on **"Use Mechanic"**:
   - The interactive **Staff PIN Modal** opens for Dante Reyes.
   - Enter `2222`.
   - The credentials quick-fill into the form.
4. Click **"Access Staff Fast-Lane POS"** (or submit the form):
   - Successfully authenticated and redirected to `/staff/compat`.
