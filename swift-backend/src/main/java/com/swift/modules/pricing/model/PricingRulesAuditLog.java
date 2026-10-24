package com.swift.modules.pricing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pricing_rules_audit_logs")
public class PricingRulesAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "changed_by")
    private UUID changedBy;

    @Column(name = "user_name")
    private String userName = "Admin";

    @Column(name = "old_retail_markup", nullable = false)
    private BigDecimal oldRetailMarkup;

    @Column(name = "new_retail_markup", nullable = false)
    private BigDecimal newRetailMarkup;

    @Column(name = "old_wholesale_markup", nullable = false)
    private BigDecimal oldWholesaleMarkup;

    @Column(name = "new_wholesale_markup", nullable = false)
    private BigDecimal newWholesaleMarkup;

    @Column(name = "old_aftermarket_markup", nullable = false)
    private BigDecimal oldAftermarketMarkup;

    @Column(name = "new_aftermarket_markup", nullable = false)
    private BigDecimal newAftermarketMarkup;

    @Column(name = "old_hourly_labor_rate", nullable = false)
    private BigDecimal oldHourlyLaborRate;

    @Column(name = "new_hourly_labor_rate", nullable = false)
    private BigDecimal newHourlyLaborRate;

    @Column
    private String reason;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public PricingRulesAuditLog() {
    }

    public PricingRulesAuditLog(UUID id, UUID changedBy, String userName,
                                BigDecimal oldRetailMarkup, BigDecimal newRetailMarkup,
                                BigDecimal oldWholesaleMarkup, BigDecimal newWholesaleMarkup,
                                BigDecimal oldAftermarketMarkup, BigDecimal newAftermarketMarkup,
                                BigDecimal oldHourlyLaborRate, BigDecimal newHourlyLaborRate,
                                String reason, OffsetDateTime createdAt) {
        this.id = id;
        this.changedBy = changedBy;
        this.userName = userName != null ? userName : "Admin";
        this.oldRetailMarkup = oldRetailMarkup;
        this.newRetailMarkup = newRetailMarkup;
        this.oldWholesaleMarkup = oldWholesaleMarkup;
        this.newWholesaleMarkup = newWholesaleMarkup;
        this.oldAftermarketMarkup = oldAftermarketMarkup;
        this.newAftermarketMarkup = newAftermarketMarkup;
        this.oldHourlyLaborRate = oldHourlyLaborRate;
        this.newHourlyLaborRate = newHourlyLaborRate;
        this.reason = reason;
        this.createdAt = createdAt != null ? createdAt : OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getChangedBy() {
        return changedBy;
    }

    public void setChangedBy(UUID changedBy) {
        this.changedBy = changedBy;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public BigDecimal getOldRetailMarkup() {
        return oldRetailMarkup;
    }

    public void setOldRetailMarkup(BigDecimal oldRetailMarkup) {
        this.oldRetailMarkup = oldRetailMarkup;
    }

    public BigDecimal getNewRetailMarkup() {
        return newRetailMarkup;
    }

    public void setNewRetailMarkup(BigDecimal newRetailMarkup) {
        this.newRetailMarkup = newRetailMarkup;
    }

    public BigDecimal getOldWholesaleMarkup() {
        return oldWholesaleMarkup;
    }

    public void setOldWholesaleMarkup(BigDecimal oldWholesaleMarkup) {
        this.oldWholesaleMarkup = oldWholesaleMarkup;
    }

    public BigDecimal getNewWholesaleMarkup() {
        return newWholesaleMarkup;
    }

    public void setNewWholesaleMarkup(BigDecimal newWholesaleMarkup) {
        this.newWholesaleMarkup = newWholesaleMarkup;
    }

    public BigDecimal getOldAftermarketMarkup() {
        return oldAftermarketMarkup;
    }

    public void setOldAftermarketMarkup(BigDecimal oldAftermarketMarkup) {
        this.oldAftermarketMarkup = oldAftermarketMarkup;
    }

    public BigDecimal getNewAftermarketMarkup() {
        return newAftermarketMarkup;
    }

    public void setNewAftermarketMarkup(BigDecimal newAftermarketMarkup) {
        this.newAftermarketMarkup = newAftermarketMarkup;
    }

    public BigDecimal getOldHourlyLaborRate() {
        return oldHourlyLaborRate;
    }

    public void setOldHourlyLaborRate(BigDecimal oldHourlyLaborRate) {
        this.oldHourlyLaborRate = oldHourlyLaborRate;
    }

    public BigDecimal getNewHourlyLaborRate() {
        return newHourlyLaborRate;
    }

    public void setNewHourlyLaborRate(BigDecimal newHourlyLaborRate) {
        this.newHourlyLaborRate = newHourlyLaborRate;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
