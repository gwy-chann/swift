package com.swift.modules.analytics.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Active and historical repair work orders executed in workshop bays.
 * Maps public.work_orders in PostgreSQL.
 */
@Entity
@Table(name = "work_orders", schema = "public", indexes = {
    @Index(name = "idx_work_orders_bay_id", columnList = "bay_id"),
    @Index(name = "idx_work_orders_status", columnList = "status"),
    @Index(name = "idx_work_orders_created_at_desc", columnList = "created_at DESC")
})
public class WorkOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "order_number", nullable = false, unique = true)
    private String orderNumber;

    @Column(name = "bay_id")
    private UUID bayId;

    @Column(name = "customer_name", nullable = false)
    private String customerName = "Walk-in Customer";

    @Column(name = "vehicle_model", nullable = false)
    private String vehicleModel;

    @Column(name = "plate_number", nullable = false)
    private String plateNumber = "N/A";

    @Column(name = "service_code", nullable = false)
    private String serviceCode = "GEN-SVC";

    @Column(name = "service_name", nullable = false)
    private String serviceName;

    @Column(name = "mechanic_id")
    private UUID mechanicId;

    @Column(name = "status", nullable = false)
    private String status = "QUEUED";

    @Column(name = "estimated_duration_minutes", nullable = false)
    private Integer estimatedDurationMinutes = 30;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now(ZoneOffset.UTC);

    public WorkOrder() {
    }

    public WorkOrder(UUID id, String orderNumber, UUID bayId, String vehicleModel, String serviceName, String status) {
        this.id = id;
        this.orderNumber = orderNumber;
        this.bayId = bayId;
        this.vehicleModel = vehicleModel;
        this.serviceName = serviceName;
        this.status = status;
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        }
        if (this.updatedAt == null) {
            this.updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
        }
        if (this.orderNumber == null) {
            this.orderNumber = "WO-" + System.currentTimeMillis();
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public UUID getBayId() {
        return bayId;
    }

    public void setBayId(UUID bayId) {
        this.bayId = bayId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getVehicleModel() {
        return vehicleModel;
    }

    public void setVehicleModel(String vehicleModel) {
        this.vehicleModel = vehicleModel;
    }

    public String getPlateNumber() {
        return plateNumber;
    }

    public void setPlateNumber(String plateNumber) {
        this.plateNumber = plateNumber;
    }

    public String getServiceCode() {
        return serviceCode;
    }

    public void setServiceCode(String serviceCode) {
        this.serviceCode = serviceCode;
    }

    public String getServiceName() {
        return serviceName;
    }

    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }

    public UUID getMechanicId() {
        return mechanicId;
    }

    public void setMechanicId(UUID mechanicId) {
        this.mechanicId = mechanicId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getEstimatedDurationMinutes() {
        return estimatedDurationMinutes;
    }

    public void setEstimatedDurationMinutes(Integer estimatedDurationMinutes) {
        this.estimatedDurationMinutes = estimatedDurationMinutes;
    }

    public OffsetDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(OffsetDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
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

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
