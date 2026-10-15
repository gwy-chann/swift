# Quickstart: Staff Shift Attendance Log History & Timesheet Tracking

**Feature**: `specs/030-staff-shift-attendance-log-history`  
**Jira Ticket**: [SIAA-30](https://the-three-devsketeers.atlassian.net/browse/SIAA-30)  

---

## 1. Quick Verification Command

Run the automated test suite targeting the attendance history table and punch store:

```bash
npm test -- components/staff/clock/__tests__/attendance-history-table.test.tsx
```

To run full project verification:

```bash
npm run typecheck
npm run lint
npm test
```

---

## 2. Interactive Verification Scenarios

### Scenario 1: Initial Log Table Rendering
1. Start development server: `npm run dev`
2. Navigate to `http://localhost:3000/staff/clock`.
3. Locate the card titled **"My Attendance & Shift Log History"**.
4. Confirm table columns: `Date`, `Staff Name`, `Time-In`, `Time-Out`, `Shift Duration`, and `Status`.

### Scenario 2: Active Shift Status Highlighting
1. In the attendance table, observe the top row (today's active shift).
2. Verify `Time-Out` displays `-- Active Shift --` styled in `text-accent`.
3. Verify `Status` badge displays green `On Shift` (`bg-success-light text-success`).

### Scenario 3: Clocking Out and Dynamic Duration Finalization
1. Click the **"Clock Out (End Shift)"** button in the punch clock panel.
2. Observe the top row of the attendance table immediately updates:
   - `Time-Out` replaces `-- Active Shift --` with the current time (e.g. `05:01:45 PM`).
   - `Shift Duration` computes final accumulated hours and minutes (e.g. `08h 59m`).
   - `Status` badge updates to `Completed` with neutral styling (`bg-bg-muted text-text-secondary`).

### Scenario 4: Chronological Ordering & Multi-Day Persistence
1. Verify rows are sorted with newest shifts on top:
   - Row 1: Today (`YYYY-MM-DD (Today)`)
   - Row 2: Yesterday (`YYYY-MM-DD`)
   - Row 3: Day before yesterday (`YYYY-MM-DD`)
2. Refresh the browser page or navigate away to `/staff/pos` and return to `/staff/clock`: verify the history records persist.
