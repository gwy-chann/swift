package com.swift.modules.shift.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Domain entity mapping to Supabase public.staff_shifts table.
 * Tracks employee punch clock attendance lifecycle: on_shift, break, completed.
 */
@Entity
@Table(name = "staff_shifts", schema = "public", indexes = {
    @Index(name = "idx_staff_shifts_profile_clock_in", columnList = "profile_id, clock_in"),
    @Index(name = "idx_staff_shifts_status_terminal", columnList = "status, terminal_id")
})
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
    private OffsetDateTime clockIn = OffsetDateTime.now(ZoneOffset.UTC);

    @Column(name = "clock_out")
    private OffsetDateTime clockOut;

    @Column(name = "duration_seconds")
    private Integer durationSeconds = 0;

    @Column(name = "status", nullable = false)
    private String status = "on_shift"; // 'on_shift', 'break', 'completed'

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now(ZoneOffset.UTC);

    public StaffShift() {}

    public StaffShift(UUID profileId, String staffName, String terminalId, String notes) {
        this.profileId = profileId;
        this.staffName = staffName;
        this.terminalId = terminalId != null && !terminalId.isBlank() ? terminalId : "Terminal #01";
        this.notes = notes;
        this.clockIn = OffsetDateTime.now(ZoneOffset.UTC);
        this.status = "on_shift";
        this.durationSeconds = 0;
        this.createdAt = this.clockIn;
        this.updatedAt = this.clockIn;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getProfileId() { return profileId; }
    public void setProfileId(UUID profileId) { this.profileId = profileId; }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }

    public String getTerminalId() { return terminalId; }
    public void setTerminalId(String terminalId) { this.terminalId = terminalId; }

    public OffsetDateTime getClockIn() { return clockIn; }
    public void setClockIn(OffsetDateTime clockIn) { this.clockIn = clockIn; }

    public OffsetDateTime getClockOut() { return clockOut; }
    public void setClockOut(OffsetDateTime clockOut) { this.clockOut = clockOut; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
