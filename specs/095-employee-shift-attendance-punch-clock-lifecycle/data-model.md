# Data Model Specification: Employee Shift Attendance & Digital Punch Clock Lifecycle

**Feature**: `specs/095-employee-shift-attendance-punch-clock-lifecycle`  
**Jira Issue**: [SIAA-95](https://the-three-devsketeers.atlassian.net/browse/SIAA-95)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  

---

## 1. Domain Entities & Database Schema Mapping

```mermaid
erDiagram
    PROFILES ||--o{ STAFF_SHIFTS : "punches shifts"
    STAFF_SHIFTS ||--o{ STAFF_SHIFT_AUDIT_LOGS : "generates immutable audit events"

    PROFILES {
        uuid id PK "references auth.users(id)"
        string email UK "staff user email"
        string full_name "display name"
        string role "cashier, mechanic, inventory_clerk, admin"
    }

    STAFF_SHIFTS {
        uuid id PK "default gen_random_uuid()"
        uuid profile_id FK "employee profile"
        string staff_name "cached employee name"
        string terminal_id "punch terminal e.g. Terminal #01"
        timestamptz clock_in "start of shift in UTC"
        timestamptz clock_out "end of shift in UTC"
        integer duration_seconds "authoritative duration"
        string status "on_shift, break, completed"
        string notes "optional shift remarks"
        timestamptz created_at "row creation timestamp"
        timestamptz updated_at "row last modified"
    }

    STAFF_SHIFT_AUDIT_LOGS {
        uuid id PK "default gen_random_uuid()"
        uuid shift_id FK "associated shift"
        uuid profile_id FK "employee profile"
        string terminal_id "punch terminal"
        string action "clock_in, clock_out, break_start, break_end"
        string notes "audit event remarks"
        timestamptz created_at "audit entry timestamp"
    }
```

---

## 2. Shift State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> OnShift : clockInShift(staffId, terminalId)
    OnShift --> Break : toggleShiftBreak(shiftId) [break_start]
    Break --> OnShift : toggleShiftBreak(shiftId) [break_end]
    OnShift --> Completed : clockOutShift(shiftId) [clock_out]
    Break --> Completed : clockOutShift(shiftId) [clock_out]
    Completed --> [*]
```

### State Transition Invariants:
1. **Clock-In**: Permitted only when no shift for `profile_id` exists with status in `('on_shift', 'break')`.
2. **Break Toggle**: Alternates strictly between `'on_shift'` and `'break'`. Fails if status is `'completed'`.
3. **Clock-Out**: Calculates duration from `clock_in` to UTC `now()`, marks status `'completed'`, and records `clock_out`. Cannot be performed on `'completed'` shifts.

---

## 3. Java Domain Models

### `StaffShift.java` (`com.swift.modules.shift.model`)
```java
@Entity
@Table(name = "staff_shifts", schema = "public")
public class StaffShift {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "profile_id", nullable = false)
    private UUID profileId;

    @Column(name = "staff_name", nullable = false)
    private String staffName;

    @Column(name = "terminal_id", nullable = false)
    private String terminalId = "Terminal #01";

    @Column(name = "clock_in", nullable = false)
    private Instant clockIn = Instant.now();

    @Column(name = "clock_out")
    private Instant clockOut;

    @Column(name = "duration_seconds")
    private Integer durationSeconds = 0;

    @Column(name = "status", nullable = false)
    private String status = "on_shift";

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    // Getters, Setters, Constructors
}
```

### `StaffShiftAuditLog.java` (`com.swift.modules.shift.model`)
```java
@Entity
@Table(name = "staff_shift_audit_logs", schema = "public")
public class StaffShiftAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "shift_id", nullable = false)
    private UUID shiftId;

    @Column(name = "profile_id", nullable = false)
    private UUID profileId;

    @Column(name = "terminal_id", nullable = false)
    private String terminalId;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // Getters, Setters, Constructors
}
```

---

## 4. DTO Transfer Objects (`com.swift.modules.shift.dto`)

### `ClockInRequest.java`
```java
public record ClockInRequest(
    @NotNull(message = "Staff profile ID is required")
    UUID staffId,
    String terminalId,
    String notes
) {}
```

### `ClockOutRequest.java`
```java
public record ClockOutRequest(
    @NotNull(message = "Shift ID is required")
    UUID shiftId,
    UUID staffId,
    String notes
) {}
```

### `ToggleBreakRequest.java`
```java
public record ToggleBreakRequest(
    @NotNull(message = "Shift ID is required")
    UUID shiftId,
    UUID staffId
) {}
```

### `ShiftResponse.java`
```java
public record ShiftResponse(
    UUID id,
    UUID staffId,
    String staffName,
    String terminalId,
    Instant clockIn,
    Instant clockOut,
    Integer durationSeconds,
    String durationFormatted,
    String status,
    String notes,
    Instant createdAt
) {}
```

### `ActiveShiftResponse.java`
```java
public record ActiveShiftResponse(
    boolean hasActiveShift,
    ShiftResponse shift,
    Long activeDurationSeconds,
    String activeDurationFormatted
) {}
```

### `AttendanceHistoryResponse.java`
```java
public record AttendanceHistoryResponse(
    List<ShiftResponse> shifts,
    ShiftResponse activeShift,
    long totalMinutesWorked,
    int page,
    int size,
    long totalElements,
    int totalPages
) {}
```
