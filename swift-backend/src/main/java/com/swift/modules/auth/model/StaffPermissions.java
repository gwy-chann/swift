package com.swift.modules.auth.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;

/**
 * Granular staff permissions JSONB mapping matching Next.js StaffPermissions.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class StaffPermissions implements Serializable {

    @JsonProperty("can_discount")
    private boolean canDiscount = false;

    @JsonProperty("can_override_discount")
    private boolean canOverrideDiscount = false;

    @JsonProperty("can_void_transaction")
    private boolean canVoidTransaction = false;

    @JsonProperty("can_adjust_stock")
    private boolean canAdjustStock = false;

    @JsonProperty("can_access_admin")
    private boolean canAccessAdmin = false;

    @JsonProperty("can_view_reports")
    private boolean canViewReports = false;

    @JsonProperty("can_manage_pricing")
    private boolean canManagePricing = false;

    public StaffPermissions() {}

    @com.fasterxml.jackson.annotation.JsonCreator
    public static StaffPermissions fromString(String json) {
        if (json == null || json.isBlank()) return new StaffPermissions();
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            String clean = json.trim();
            if (clean.startsWith("\"") && clean.endsWith("\"")) {
                clean = mapper.readValue(clean, String.class);
            }
            return mapper.readValue(clean, StaffPermissions.class);
        } catch (Exception e) {
            return new StaffPermissions();
        }
    }

    public StaffPermissions(boolean canDiscount, boolean canOverrideDiscount, boolean canVoidTransaction,
                            boolean canAdjustStock, boolean canAccessAdmin, boolean canViewReports) {
        this.canDiscount = canDiscount;
        this.canOverrideDiscount = canOverrideDiscount;
        this.canVoidTransaction = canVoidTransaction;
        this.canAdjustStock = canAdjustStock;
        this.canAccessAdmin = canAccessAdmin;
        this.canViewReports = canViewReports;
        this.canManagePricing = canAccessAdmin;
    }

    public StaffPermissions(boolean canDiscount, boolean canOverrideDiscount, boolean canVoidTransaction,
                            boolean canAdjustStock, boolean canAccessAdmin, boolean canViewReports, boolean canManagePricing) {
        this.canDiscount = canDiscount;
        this.canOverrideDiscount = canOverrideDiscount;
        this.canVoidTransaction = canVoidTransaction;
        this.canAdjustStock = canAdjustStock;
        this.canAccessAdmin = canAccessAdmin;
        this.canViewReports = canViewReports;
        this.canManagePricing = canManagePricing;
    }

    public static StaffPermissions adminDefaults() {
        return new StaffPermissions(true, true, true, true, true, true, true);
    }

    public static StaffPermissions cashierDefaults() {
        return new StaffPermissions(true, false, false, false, false, false, false);
    }

    public static StaffPermissions inventoryClerkDefaults() {
        StaffPermissions p = new StaffPermissions();
        p.setCanAdjustStock(true);
        return p;
    }

    public static StaffPermissions forRole(String role) {
        if (role == null) return new StaffPermissions();
        return switch (role.toLowerCase()) {
            case "admin" -> adminDefaults();
            case "inventory_clerk" -> inventoryClerkDefaults();
            case "cashier" -> cashierDefaults();
            default -> new StaffPermissions();
        };
    }

    public boolean isCanDiscount() { return canDiscount; }
    public void setCanDiscount(boolean canDiscount) { this.canDiscount = canDiscount; }

    public boolean isCanOverrideDiscount() { return canOverrideDiscount; }
    public void setCanOverrideDiscount(boolean canOverrideDiscount) { this.canOverrideDiscount = canOverrideDiscount; }

    public boolean isCanVoidTransaction() { return canVoidTransaction; }
    public void setCanVoidTransaction(boolean canVoidTransaction) { this.canVoidTransaction = canVoidTransaction; }

    public boolean isCanAdjustStock() { return canAdjustStock; }
    public void setCanAdjustStock(boolean canAdjustStock) { this.canAdjustStock = canAdjustStock; }

    public boolean isCanAccessAdmin() { return canAccessAdmin; }
    public void setCanAccessAdmin(boolean canAccessAdmin) { this.canAccessAdmin = canAccessAdmin; }

    public boolean isCanViewReports() { return canViewReports; }
    public void setCanViewReports(boolean canViewReports) { this.canViewReports = canViewReports; }

    public boolean isCanManagePricing() { return canManagePricing; }
    public void setCanManagePricing(boolean canManagePricing) { this.canManagePricing = canManagePricing; }
}
