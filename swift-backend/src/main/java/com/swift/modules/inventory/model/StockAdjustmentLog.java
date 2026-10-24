package com.swift.modules.inventory.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "stock_adjustment_logs")
public class StockAdjustmentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String sku;

    @Column(name = "adjustment_type", nullable = false)
    private String adjustmentType;

    @Column(name = "quantity_delta", nullable = false)
    private Integer quantityDelta;

    @Column(name = "previous_stock", nullable = false)
    private Integer previousStock;

    @Column(name = "new_stock", nullable = false)
    private Integer newStock;

    @Column
    private String reason;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "user_name", nullable = false)
    private String userName = "Staff Member";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public StockAdjustmentLog() {
    }

    public StockAdjustmentLog(UUID id, String sku, String adjustmentType, Integer quantityDelta,
                              Integer previousStock, Integer newStock, String reason,
                              UUID userId, String userName, OffsetDateTime createdAt) {
        this.id = id;
        this.sku = sku;
        this.adjustmentType = adjustmentType;
        this.quantityDelta = quantityDelta;
        this.previousStock = previousStock;
        this.newStock = newStock;
        this.reason = reason;
        this.userId = userId;
        this.userName = userName != null ? userName : "Staff Member";
        this.createdAt = createdAt != null ? createdAt : OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getAdjustmentType() {
        return adjustmentType;
    }

    public void setAdjustmentType(String adjustmentType) {
        this.adjustmentType = adjustmentType;
    }

    public Integer getQuantityDelta() {
        return quantityDelta;
    }

    public void setQuantityDelta(Integer quantityDelta) {
        this.quantityDelta = quantityDelta;
    }

    public Integer getPreviousStock() {
        return previousStock;
    }

    public void setPreviousStock(Integer previousStock) {
        this.previousStock = previousStock;
    }

    public Integer getNewStock() {
        return newStock;
    }

    public void setNewStock(Integer newStock) {
        this.newStock = newStock;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
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
