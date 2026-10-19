# Implementation Plan: Staff Kiosk Authentication & Database Persistence

**Feature**: `078-staff-kiosk-auth`  
**Jira Issue**: [SIAA-78](https://the-three-devsketeers.atlassian.net/browse/SIAA-78)  
**Date**: 2026-10-20  

---

## 1. Component Hierarchy & Boundary Mapping

```text
app/staff/clock/page.tsx (Staff Punch Clock Page Container)
├── TerminalLiveClock (Digital 24h/12h Manila live clock)
├── PunchClockPanel (Interactive Shift Management Panel)
│   ├── StaffProfileSwitcher (NEW: Quick profile cards/pills for staff selection)
│   │   ├── Active Staff Avatar & Role Badge
│   │   └── "Switch Staff" Modal / Trigger
│   ├── StaffPinModal (NEW: 4-digit PIN verification keypad modal)
│   ├── Shift Buttons (Time In, Take Break, Time Out)
│   └── Shift Timer & Status Indicators
└── AttendanceHistoryTable (Real-time and historic shift logs)
```

---

## 2. File Modification & Creation Inventory

| File Path | Action | Rationale |
|:---|:---|:---|
| `specs/078-staff-kiosk-auth/contracts/kiosk-auth.contract.ts` | Create | Zod validation schemas for PIN verification and profile DTOs. |
| `supabase/migrations/20261021000000_staff_kiosk_auth_rpcs.sql` | Create | Migration adding `pin_code` column to `public.profiles` and updating `clock_in_shift`, `clock_out_shift`, and `toggle_shift_break` to accept `p_profile_id UUID`. |
| `lib/staff/actions.ts` | Modify | Add `verifyStaffPinAction(profileId, pin)` and adapt `clockInShiftAction`, `clockOutShiftAction`, `toggleShiftBreakAction` to accept and pass `profileId`. |
| `lib/store/punch-store.ts` | Modify | Enhance `PunchStore` to support multi-staff shift isolation (`staffSessions`), individual timers, and profile switching. |
| `components/staff/clock/staff-pin-modal.tsx` | Create | Reusable touch-friendly 4-digit numeric PIN keypad modal with accessible keyboard and button inputs. |
| `components/staff/clock/staff-profile-switcher.tsx` | Create | Staff profile selector component displaying available staff personas with status dots and switch action. |
| `components/staff/clock/punch-clock-panel.tsx` | Modify | Integrate `StaffProfileSwitcher` and `StaffPinModal` into clock-in flow, passing authenticated employee ID to server actions. |
| `lib/staff/__tests__/staff-kiosk-auth.test.ts` | Create | Unit tests for `verifyStaffPinAction`, profile resolution, and RPC actions. |
| `components/staff/clock/__tests__/staff-pin-modal.test.tsx` | Create | Component tests for PIN keypad modal, input validation, and PIN submission. |

---

## 3. SWIFT Design Tokens Adherence

- **PIN Pad Modal Surface**:
  - Container: `bg-bg-surface border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6`
  - PIN Dots Display: `w-4 h-4 rounded-full border-2 border-primary` (filled with `bg-primary` when entered)
  - Numeric Keypad Buttons: `h-14 rounded-xl bg-bg-card hover:bg-bg-hover active:bg-primary/20 border border-border text-lg font-bold text-text-primary transition-colors`
  - Submit Button: `bg-primary hover:bg-primary-hover text-text-light font-bold`
- **Profile Switcher**:
  - Selected Profile Card: `bg-bg-card border border-border rounded-xl p-3 flex items-center justify-between`
  - Switcher Pills: `px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-bg-hover`
  - Role Badges: `text-xs px-2 py-0.5 rounded-md bg-secondary/15 text-secondary border border-secondary/30`

---

## 4. Test Strategy

1. **Unit Tests (`staff-kiosk-auth.test.ts`)**:
   - `verifyStaffPinAction`: validates correct PIN returns `{ success: true, profile: { ... } }`.
   - `verifyStaffPinAction`: invalid PIN returns `{ success: false, code: 'INVALID_PIN' }`.
   - `clockInShiftAction`: accepts `profileId` and attributes shift correctly.
   - `PunchStore`: switching between Mike Morales and Dante Reyes keeps each employee's elapsed time and status isolated.
2. **Component Tests (`staff-pin-modal.test.tsx`)**:
   - Renders 4-digit keypad when open.
   - Allows typing digits via on-screen buttons or keyboard.
   - Invokes `onSuccess` when valid PIN submitted.
   - Displays error banner on invalid PIN.
