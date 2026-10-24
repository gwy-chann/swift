package com.swift.modules.services.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "service_rate_audit_logs", indexes = {
    @Index(name = "idx_rate_audit_service_id", columnList = "service_id"),
    @Index(name = "idx_rate_audit_created_at", columnList = "created_at")
})
public class ServiceRateAuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "service_id", nullable = false)
    private UUID serviceId;

    @Column(name = "service_code", nullable = false, length = 64)
    private String serviceCode;

    @Column(name = "old_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal oldRate;

    @Column(name = "new_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal newRate;

    @Column(nullable = false, length = 255)
    private String reason = "";

    @Column(name = "user_name", nullable = false, length = 100)
    private String userName = "Service Desk Manager";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public ServiceRateAuditLogEntity() {
    }

    public ServiceRateAuditLogEntity(UUID id, UUID serviceId, String serviceCode,
                                     BigDecimal oldRate, BigDecimal newRate,
                                     String reason, String userName, OffsetDateTime createdAt) {
        this.id = id;
        this.serviceId = serviceId;
        this.serviceCode = serviceCode;
        this.oldRate = oldRate;
        this.newRate = newRate;
        this.reason = reason != null ? reason : "";
        this.userName = userName != null ? userName : "Service Desk Manager";
        this.createdAt = createdAt != null ? createdAt : OffsetDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (reason == null) {
            reason = "";
        }
        if (userName == null) {
            userName = "Service Desk Manager";
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getServiceId() {
        return serviceId;
    }

    public void setServiceId(UUID serviceId) {
        this.serviceId = serviceId;
    }

    public String getServiceCode() {
        return serviceCode;
    }

    public void setServiceCode(String serviceCode) {
        this.serviceCode = serviceCode;
    }

    public BigDecimal getOldRate() {
        return oldRate;
    }

    public void setOldRate(BigDecimal oldRate) {
        this.oldRate = oldRate;
    }

    public BigDecimal getNewRate() {
        return newRate;
    }

    public void setNewRate(BigDecimal newRate) {
        this.newRate = newRate;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
