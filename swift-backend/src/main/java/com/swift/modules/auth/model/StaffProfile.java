package com.swift.modules.auth.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Domain entity mapping to Supabase public.profiles table.
 */
@Entity
@Table(name = "profiles", schema = "public")
public class StaffProfile {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "role", nullable = false)
    private String role; // "admin", "staff", "cashier", "mechanic", "inventory_clerk"

    @Column(name = "status", nullable = false)
    private String status = "Active";

    @Column(name = "pin_code", length = 10)
    private String pinCode = "1234";

    @jakarta.persistence.Convert(converter = StaffPermissionsConverter.class)
    @Column(name = "permissions", columnDefinition = "jsonb")
    private StaffPermissions permissions;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public StaffProfile() {}

    public StaffProfile(UUID id, String email, String fullName, String role, String status, String pinCode, StaffPermissions permissions) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.status = status;
        this.pinCode = pinCode;
        this.permissions = permissions;
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPinCode() { return pinCode; }
    public void setPinCode(String pinCode) { this.pinCode = pinCode; }

    public StaffPermissions getPermissions() { return permissions; }
    public void setPermissions(StaffPermissions permissions) { this.permissions = permissions; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public boolean isActive() {
        return "Active".equalsIgnoreCase(status);
    }
}
