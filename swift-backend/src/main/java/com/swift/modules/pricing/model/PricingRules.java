package com.swift.modules.pricing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pricing_rules")
public class PricingRules {

    @Id
    @Column(name = "id")
    private Integer id = 1;

    @Column(name = "retail_markup", nullable = false)
    private BigDecimal retailMarkup = new BigDecimal("35.00");

    @Column(name = "wholesale_markup", nullable = false)
    private BigDecimal wholesaleMarkup = new BigDecimal("18.00");

    @Column(name = "aftermarket_markup", nullable = false)
    private BigDecimal aftermarketMarkup = new BigDecimal("40.00");

    @Column(name = "hourly_labor_rate", nullable = false)
    private BigDecimal hourlyLaborRate = new BigDecimal("450.00");

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @Column(name = "updated_by")
    private UUID updatedBy;

    public PricingRules() {
    }

    public PricingRules(Integer id, BigDecimal retailMarkup, BigDecimal wholesaleMarkup,
                        BigDecimal aftermarketMarkup, BigDecimal hourlyLaborRate,
                        OffsetDateTime updatedAt, UUID updatedBy) {
        this.id = id != null ? id : 1;
        this.retailMarkup = retailMarkup != null ? retailMarkup : new BigDecimal("35.00");
        this.wholesaleMarkup = wholesaleMarkup != null ? wholesaleMarkup : new BigDecimal("18.00");
        this.aftermarketMarkup = aftermarketMarkup != null ? aftermarketMarkup : new BigDecimal("40.00");
        this.hourlyLaborRate = hourlyLaborRate != null ? hourlyLaborRate : new BigDecimal("450.00");
        this.updatedAt = updatedAt != null ? updatedAt : OffsetDateTime.now();
        this.updatedBy = updatedBy;
    }

    public PricingRules(Long id, BigDecimal retailMarkup, BigDecimal wholesaleMarkup,
                        BigDecimal aftermarketMarkup, BigDecimal hourlyLaborRate,
                        OffsetDateTime updatedAt, UUID updatedBy) {
        this(id != null ? id.intValue() : 1, retailMarkup, wholesaleMarkup, aftermarketMarkup, hourlyLaborRate, updatedAt, updatedBy);
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public BigDecimal getRetailMarkup() {
        return retailMarkup;
    }

    public void setRetailMarkup(BigDecimal retailMarkup) {
        this.retailMarkup = retailMarkup;
    }

    public BigDecimal getWholesaleMarkup() {
        return wholesaleMarkup;
    }

    public void setWholesaleMarkup(BigDecimal wholesaleMarkup) {
        this.wholesaleMarkup = wholesaleMarkup;
    }

    public BigDecimal getAftermarketMarkup() {
        return aftermarketMarkup;
    }

    public void setAftermarketMarkup(BigDecimal aftermarketMarkup) {
        this.aftermarketMarkup = aftermarketMarkup;
    }

    public BigDecimal getHourlyLaborRate() {
        return hourlyLaborRate;
    }

    public void setHourlyLaborRate(BigDecimal hourlyLaborRate) {
        this.hourlyLaborRate = hourlyLaborRate;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(UUID updatedBy) {
        this.updatedBy = updatedBy;
    }
}
