# Quickstart & Verification Guide: Terminal Digital Shift Punch Clock

**Feature**: `029-terminal-digital-shift-punch-clock`  
**Jira Ticket**: [SIAA-29](https://the-three-devsketeers.atlassian.net/browse/SIAA-29)  

---

## 1. Local Development Setup

```bash
cd .worktrees/SIAA-29
npm run dev
```
Open [http://localhost:3000/staff/clock](http://localhost:3000/staff/clock).

---

## 2. Manual Verification Scenarios

### Scenario 1: Live Terminal Clock Display
1. Navigate to `/staff/clock`.
2. Inspect `#liveClockDisplay`.
3. Verify the time renders in 12-hour format (e.g., `08:14:30 AM`) and advances once per second.

### Scenario 2: Clock-In Trigger & Active Counter Initiation
1. Ensure the user is clocked out or click clock out first if starting on shift.
2. Status badge `#punchStatusBadge` displays `CURRENT STATUS: CLOCKED OUT` (or `OFF SHIFT`).
3. Click button `TIME IN (SHIFT START)`.
4. Verify:
   - Status badge transitions to `CURRENT STATUS: ON SHIFT` (semantic green).
   - Topbar `#shiftTimerDisplay` resets and starts counting from `00:00:00`.
   - New row appears in attendance history with today's date and time-in.

### Scenario 3: Real-Time Topbar Persistence Across Navigation
1. While shift is active and counting (e.g., `00:00:15`), click navigation links in sidebar:
   - Click "Fast-Lane POS" (`/staff/pos`).
   - Click "Stock & Shelf Finder" (`/staff/search`).
   - Click "Model Fitment Search" (`/staff/compat`).
2. Observe topbar `#shiftTimerDisplay`:
   - It continues ticking without resetting or jumping back to `00:00:00`.

### Scenario 4: Duplicate Clock-In Guard & Clock-Out
1. Navigate back to `/staff/clock`.
2. While on shift, click `TIME IN (SHIFT START)`.
3. Verify an alert/dialog appears: *"You are already clocked in for this shift!"*.
4. Click `TIME OUT (SHIFT END)`.
5. Verify:
   - Status badge transitions to `CURRENT STATUS: CLOCKED OUT`.
   - Topbar timer pauses and shift duration is finalized.

---

## 3. Automated Test Suite

```bash
npm run test -- lib/store/__tests__/punch-store-guard.test.ts components/staff/__tests__/
```
