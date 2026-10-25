package com.swift.modules.shift.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Domain entity mapping to Supabase public.staff_shift_audit_logs table.
 * Append-only immutable ledger for shift state changes (clock_in, clock_out, break_start, break_end).
 */
@Entity
@Table(name = "staff_shift_audit_logs", schema = "public", indexes = {
    @Index(name = "idx_staff_shift_audit_logs_shift", columnList = "shift_id"),
    @Index(name = "idx_staff_shift_audit_logs_profile", columnList = "profile_id")
})
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
    private String action; // 'clock_in', 'clock_out', 'break_start', 'break_end'

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);

    public StaffShiftAuditLog() {}

    public StaffShiftAuditLog(UUID shiftId, UUID profileId, String terminalId, String action, String notes) {
        this.shiftId = shiftId;
        this.profileId = profileId;
        this.terminalId = terminalId;
        this.action = action;
        this.notes = notes;
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getShiftId() { return shiftId; }
    public void setShiftId(UUID shiftId) { this.shiftId = shiftId; }

    public UUID getProfileId() { return profileId; }
    public void setProfileId(UUID profileId) { this.profileId = profileId; }

    public String getTerminalId() { return terminalId; }
    public void setTerminalId(String terminalId) { this.terminalId = terminalId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
