# Quickstart & Verification Guide: Employee Shift Attendance & Digital Punch Clock Lifecycle

**Feature**: `specs/095-employee-shift-attendance-punch-clock-lifecycle`  
**Jira Issue**: [SIAA-95](https://the-three-devsketeers.atlassian.net/browse/SIAA-95)  

---

## 1. Prerequisites & Setup

Ensure the worktree environment is active:
```bash
git branch --show-current
# Expected: feat/SIAA-95-employee-shift-attendance-punch-clock-lifecycle
```

Build and run backend tests:
```bash
cd swift-backend
./mvnw clean test -Dtest=ShiftAttendanceControllerTests
```

---

## 2. API Verification Workflows

### Scenario 1: Clock In for Work Shift
```bash
curl -X POST http://localhost:8080/api/v1/shifts/clock-in \
  -H "Content-Type: application/json" \
  -d '{
    "staffId": "00000000-0000-0000-0000-000000000002",
    "terminalId": "Terminal #01",
    "notes": "Morning Cashier Shift"
  }'
```
**Expected Response**: `HTTP 200 OK`
```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "staffId": "00000000-0000-0000-0000-000000000002",
  "staffName": "Mike Morales",
  "terminalId": "Terminal #01",
  "clockIn": "2026-10-25T08:00:00Z",
  "clockOut": null,
  "durationSeconds": 0,
  "durationFormatted": null,
  "status": "on_shift",
  "notes": "Morning Cashier Shift",
  "createdAt": "2026-10-25T08:00:00Z"
}
```

---

### Scenario 2: Prevent Duplicate Active Clock-In
```bash
curl -X POST http://localhost:8080/api/v1/shifts/clock-in \
  -H "Content-Type: application/json" \
  -d '{
    "staffId": "00000000-0000-0000-0000-000000000002",
    "terminalId": "Terminal #01"
  }'
```
**Expected Response**: `HTTP 409 Conflict`
```json
{
  "status": 409,
  "error": "Conflict",
  "code": "ACTIVE_SHIFT_EXISTS",
  "message": "Active shift already in progress. Please clock out before starting a new shift."
}
```

---

### Scenario 3: Shift Rehydration Surviving Browser Hard Refresh (F5)
```bash
curl -X GET http://localhost:8080/api/v1/shifts/active/00000000-0000-0000-0000-000000000002
```
**Expected Response**: `HTTP 200 OK`
```json
{
  "hasActiveShift": true,
  "shift": {
    "id": "11111111-2222-3333-4444-555555555555",
    "staffId": "00000000-0000-0000-0000-000000000002",
    "staffName": "Mike Morales",
    "terminalId": "Terminal #01",
    "clockIn": "2026-10-25T08:00:00Z",
    "clockOut": null,
    "status": "on_shift"
  },
  "activeDurationSeconds": 2700,
  "activeDurationFormatted": "00h 45m"
}
```

---

### Scenario 4: Toggle Meal Break Interval
```bash
curl -X POST http://localhost:8080/api/v1/shifts/toggle-break \
  -H "Content-Type: application/json" \
  -d '{
    "shiftId": "11111111-2222-3333-4444-555555555555"
  }'
```
**Expected Response**: `HTTP 200 OK`
```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "status": "break"
}
```

---

### Scenario 5: Clock Out and Calculate Duration
```bash
curl -X POST http://localhost:8080/api/v1/shifts/clock-out \
  -H "Content-Type: application/json" \
  -d '{
    "shiftId": "11111111-2222-3333-4444-555555555555",
    "notes": "Finished daily shift"
  }'
```
**Expected Response**: `HTTP 200 OK`
```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "clockOut": "2026-10-25T16:15:00Z",
  "durationSeconds": 29700,
  "durationFormatted": "08h 15m",
  "status": "completed"
}
```

---

### Scenario 6: Query Attendance History
```bash
curl -X GET "http://localhost:8080/api/v1/staff/attendance-history?staffId=00000000-0000-0000-0000-000000000002&page=0&size=20"
```
**Expected Response**: `HTTP 200 OK`
```json
{
  "shifts": [ ... ],
  "activeShift": null,
  "totalMinutesWorked": 495,
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```
