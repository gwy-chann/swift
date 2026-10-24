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

    public StaffPermissions() {}

    public StaffPermissions(boolean canDiscount, boolean canOverrideDiscount, boolean canVoidTransaction,
                            boolean canAdjustStock, boolean canAccessAdmin, boolean canViewReports) {
        this.canDiscount = canDiscount;
        this.canOverrideDiscount = canOverrideDiscount;
        this.canVoidTransaction = canVoidTransaction;
        this.canAdjustStock = canAdjustStock;
        this.canAccessAdmin = canAccessAdmin;
        this.canViewReports = canViewReports;
    }

    public static StaffPermissions adminDefaults() {
        return new StaffPermissions(true, true, true, true, true, true);
    }

    public static StaffPermissions cashierDefaults() {
        return new StaffPermissions(true, false, false, false, false, false);
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
}
