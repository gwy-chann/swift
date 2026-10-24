package com.swift.modules.auth.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Domain entity mapping to Supabase public.security_audit_logs table.
 */
@Entity
@Table(name = "security_audit_logs", schema = "public")
public class SecurityAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "timestamp", nullable = false)
    private OffsetDateTime timestamp = OffsetDateTime.now(ZoneOffset.UTC);

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "severity", nullable = false)
    private String severity; // 'info', 'warning', 'security_alert'

    @Column(name = "terminal_ip")
    private String terminalIp;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);

    public SecurityAuditLog() {}

    public SecurityAuditLog(UUID userId, String userEmail, String action, String severity, String terminalIp, Map<String, Object> metadata) {
        this.timestamp = OffsetDateTime.now(ZoneOffset.UTC);
        this.userId = userId;
        this.userEmail = userEmail;
        this.action = action;
        this.severity = severity;
        this.terminalIp = terminalIp;
        this.metadata = metadata != null ? metadata : Map.of();
        this.createdAt = this.timestamp;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public OffsetDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(OffsetDateTime timestamp) { this.timestamp = timestamp; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getTerminalIp() { return terminalIp; }
    public void setTerminalIp(String terminalIp) { this.terminalIp = terminalIp; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
