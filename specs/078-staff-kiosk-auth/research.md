# Architecture Research: Staff Kiosk Authentication & Database Persistence

**Feature**: `078-staff-kiosk-auth`  
**Jira Issue**: [SIAA-78](https://the-three-devsketeers.atlassian.net/browse/SIAA-78)  
**Date**: 2026-10-20  

---

## 1. Stack Constraints & Dependencies

- **Framework**: Next.js 15+ (App Router), React 19 (`useSyncExternalStore`, Client Component boundary)
- **Database & Backend**: PostgreSQL via Supabase RPCs, Server Actions (`"use server"` in `lib/staff/actions.ts`), Next.js cache revalidation (`updateTag('staff-shifts')`).
- **Styling**: Tailwind CSS v4 using semantic design tokens (`bg-bg-surface`, `bg-bg-card`, `text-text-primary`, `border-border`, `bg-primary`, `bg-success-light`, `text-success`).
- **State Engines**:
  - `usePunchStore` (`lib/store/punch-store.ts`): External store maintaining staff attendance state, multi-staff active shifts, duration timers, and punch logs.
- **Reference Assets**:
  - `../mockup/staff.html`: Staff Shop Floor Terminal, punch clock layout, user cards, PIN modal styling.
  - `../mockup/app.js`: Users roster (`Carlos Rodriguez`, `Mike Morales`, `Dante Reyes`, `Rico Santos`).
  - `../docs/features.md`: Section 6 & 8 (Staff Terminal & Time Clock).

---

## 2. Problem Diagnosis & Existing Architecture Analysis

### The Root Cause of Mock Fallback
1. In `app/staff/clock/page.tsx` and `components/staff/clock/punch-clock-panel.tsx`:
   - The UI defaults to `DEFAULT_STAFF_USER.name` (`Mike Morales`).
   - The user visits the terminal without going through standard Supabase web auth login (shared floor kiosk mode).
   - Thus, Supabase client has no JWT / session cookie (`auth.uid()` is `null`).
2. When `clockInShiftAction` calls `supabase.rpc('clock_in_shift')`:
   - `clock_in_shift` executes `v_profile_id := auth.uid();`
   - It raises exception `UNAUTHENTICATED` (error code `28000`).
   - `clockInShiftAction` catches this in `parseClockInError()`:
     ```ts
     if (errorText.includes('UNAUTHENTICATED') || error.code === '28000') {
       console.warn('[clockInShiftAction] Session unauthenticated, using fallback engine.');
       return null;
     }
     ```
   - As a result, it falls back to generating a fake in-memory `mock-${Date.now()}` response without inserting into `public.staff_shifts` or `public.staff_shift_audit_logs`.

---

## 3. Architecture Decisions (ADRs)

### ADR-1: Terminal Kiosk Profile Resolution & PIN Verification
- **Decision**: Introduce a server action `verifyStaffPinAction(profileId: string, pin: string)` in `lib/staff/actions.ts`.
- **Mechanism**:
  - Standard demo PINs:
    - Mike Morales (`00000000-0000-0000-0000-000000000002`): `1234`
    - Dante Reyes (`00000000-0000-0000-0000-000000000003`): `2222`
    - Rico Santos (`00000000-0000-0000-0000-000000000004`): `3333`
    - Carlos Rodriguez (`00000000-0000-0000-0000-000000000001`): `8888`
  - When Supabase is configured: A new column `pin_code VARCHAR(10) DEFAULT '1234'` in `public.profiles` allows storing and verifying the staff kiosk PIN.
  - Returns `{ success: true, profile: { id, name, email, role } }` or `{ success: false, code: 'INVALID_PIN', error: 'Invalid PIN entered.' }`.

### ADR-2: Stored Procedure Parameter Extension with Fallback
- **Decision**: Update `public.clock_in_shift`, `public.clock_out_shift`, and `public.toggle_shift_break` to accept optional `p_profile_id UUID DEFAULT NULL`.
- **Stored Procedure Logic**:
  ```sql
  v_profile_id := COALESCE(auth.uid(), p_profile_id);
  IF v_profile_id IS NULL THEN
      RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '28000', DETAIL = 'Must be authenticated or provide a valid staff profile ID.';
  END IF;
  ```
- **Permission & Security**:
  - The procedure runs `SECURITY DEFINER` with search path `public, auth`.
  - Accessible to `authenticated`, `anon`, and `service_role` so kiosk workstations can punch shifts while server actions validate PINs.

### ADR-3: Multi-Staff Shift Tracking in External Reactive Store (`PunchStore`)
- **Decision**: Upgrade `PunchStore` to track per-employee shift state:
  ```ts
  interface StaffShiftRecord {
    isShiftActive: boolean;
    shiftStatus: ShiftStateStatus;
    shiftSeconds: number;
    shiftId?: string;
  }
  ```
- **Reasoning**: In a real shop floor terminal, Mechanic Dante might clock in at 8:00 AM, Cashier Mike might take over at 9:00 AM. When Mike selects his name, his active timer displays. When Dante switches to record his lunch break, Dante's timer displays without overwriting or resetting Mike's shift.

### ADR-4: Accessible PIN Pad & Profile Switcher Component
- **Decision**: Create `StaffPinModal` and `StaffProfileSwitcher` in `components/staff/clock/`:
  - 4-digit numeric input with touch-friendly numbers keypad (1-9, 0, Backspace, Clear) matching physical terminal touchscreens.
  - Keyboard listeners for physical numeric keypads.
  - Prominent display of selected staff member with avatar, role badge, and current status.
  - Strict token adherence (`bg-bg-surface`, `border-border`, `text-primary`, etc.).

---

## 4. Design Tokens & Visual Hierarchy Mapping

- **Modal Backdrop**: `fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4`
- **PIN Pad Modal Surface**: `bg-bg-surface border border-border rounded-xl shadow-xl max-w-sm w-full p-6`
- **Keypad Buttons**: `h-14 rounded-lg bg-bg-card hover:bg-bg-hover active:bg-primary-light border border-border text-lg font-bold text-text-primary transition-colors`
- **Status Badges**:
  - On Shift: `bg-success-light text-success border border-success/40`
  - Break: `bg-accent-light text-accent border border-accent/40`
  - Clocked Out / Idle: `bg-bg-muted text-text-muted border border-border`
