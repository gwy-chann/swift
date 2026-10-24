package com.swift.modules.motomatcher.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "product_fitments")
public class ProductFitment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "model_id", nullable = false)
    private UUID modelId;

    @Column(name = "fitment_type", nullable = false)
    private String fitmentType;

    @Column(name = "year_range")
    private String yearRange;

    @Column
    private String notes;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public ProductFitment() {
    }

    public ProductFitment(UUID id, UUID productId, UUID modelId, String fitmentType, String yearRange, String notes) {
        this.id = id;
        this.productId = productId;
        this.modelId = modelId;
        this.fitmentType = fitmentType;
        this.yearRange = yearRange;
        this.notes = notes;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getProductId() {
        return productId;
    }

    public void setProductId(UUID productId) {
        this.productId = productId;
    }

    public UUID getModelId() {
        return modelId;
    }

    public void setModelId(UUID modelId) {
        this.modelId = modelId;
    }

    public String getFitmentType() {
        return fitmentType;
    }

    public void setFitmentType(String fitmentType) {
        this.fitmentType = fitmentType;
    }

    public String getYearRange() {
        return yearRange;
    }

    public void setYearRange(String yearRange) {
        this.yearRange = yearRange;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
