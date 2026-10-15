"use client";

import React, { useState } from "react";
import { X, UserCheck, Shield, Check, AlertCircle } from "lucide-react";
import type { DbUserRole, StaffPermissions } from "@/lib/types/auth";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/types/auth";
import type { StaffUserSummary } from "@/specs/031-user-account-provisioning-rbac-management/contracts/user-management.contract";
import { updateStaffUserAction } from "@/lib/admin/user-actions";

interface EditStaffModalProps {
  isOpen: boolean;
  user: StaffUserSummary | null;
  onClose: () => void;
  onStaffUpdated: (updatedUser: StaffUserSummary) => void;
}

const ROLE_OPTIONS: { label: string; value: DbUserRole }[] = [
  { label: "Inventory Clerk", value: "inventory_clerk" },
  { label: "Cashier", value: "cashier" },
  { label: "Mechanic", value: "mechanic" },
  { label: "Staff", value: "staff" },
  { label: "Admin", value: "admin" },
];

export function EditStaffModal({
  isOpen,
  user,
  onClose,
  onStaffUpdated,
}: EditStaffModalProps) {
  if (!isOpen || !user) return null;

  return (
    <EditStaffModalDialog
      key={user.id}
      user={user}
      onClose={onClose}
      onStaffUpdated={onStaffUpdated}
    />
  );
}

function EditStaffModalDialog({
  user,
  onClose,
  onStaffUpdated,
}: {
  user: StaffUserSummary;
  onClose: () => void;
  onStaffUpdated: (updatedUser: StaffUserSummary) => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [role, setRole] = useState<DbUserRole>(user.role);
  const [permissions, setPermissions] = useState<StaffPermissions>({
    ...user.permissions,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRoleChange = (selectedRole: DbUserRole) => {
    setRole(selectedRole);
    // Suggest default permissions for new role while keeping user customization optional
    const defaults = DEFAULT_ROLE_PERMISSIONS[selectedRole];
    if (defaults) {
      setPermissions((prev) => ({
        ...prev,
        ...defaults,
      }));
    }
  };

  const handlePermissionToggle = (key: keyof StaffPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }

    setLoading(true);

    try {
      const result = await updateStaffUserAction({
        userId: user.id,
        fullName: fullName.trim(),
        role,
        permissions,
      });

      if (!result.success || !result.data) {
        setErrorMsg(result.error || "Failed to update staff account.");
        setLoading(false);
        return;
      }

      onStaffUpdated(result.data);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-staff-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-light text-primary flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="edit-staff-modal-title" className="text-sm font-bold text-text-primary">
                Edit Staff Member & RBAC Permissions
              </h2>
              <p className="text-[11px] text-text-secondary">
                Modify employee details, job role, and operational access flags.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-danger-light border border-danger/30 text-danger rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email (Read-Only) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary">
              Login Email (Read-Only)
            </label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-3.5 py-2 rounded-xl bg-bg-muted border border-border text-xs text-text-muted cursor-not-allowed"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label htmlFor="edit-staff-fullname" className="text-xs font-semibold text-text-secondary">
              Full Name *
            </label>
            <input
              id="edit-staff-fullname"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Maria Clara Santos"
              className="w-full px-3.5 py-2 rounded-xl bg-bg-surface border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary transition-colors"
            />
          </div>

          {/* System Role */}
          <div className="space-y-1">
            <label htmlFor="edit-staff-role" className="text-xs font-semibold text-text-secondary">
              Assigned System Role *
            </label>
            <select
              id="edit-staff-role"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as DbUserRole)}
              className="w-full px-3.5 py-2 rounded-xl bg-bg-surface border border-border text-xs text-text-primary focus:outline-hidden focus:border-primary transition-colors"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Granular Permissions Section */}
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-text-primary">
                Granular Operational Permissions
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              Enable specific override capabilities for this employee.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <PermissionCheckbox
                label="Stock In & Adjustments"
                description="Warehouse inventory and receiving"
                checked={permissions.can_adjust_stock}
                onChange={() => handlePermissionToggle("can_adjust_stock")}
              />
              <PermissionCheckbox
                label="Discount Override"
                description="Higher custom or senior discounts"
                checked={permissions.can_override_discount}
                onChange={() => handlePermissionToggle("can_override_discount")}
              />
              <PermissionCheckbox
                label="Manage Pricing"
                description="Base rate and markup rules editing"
                checked={permissions.can_manage_pricing}
                onChange={() => handlePermissionToggle("can_manage_pricing")}
              />
              <PermissionCheckbox
                label="Audit Reports Access"
                description="Forensic activity logs & KPI view"
                checked={permissions.can_view_reports}
                onChange={() => handlePermissionToggle("can_view_reports")}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-primary text-text-light text-xs font-bold hover:bg-primary-hover shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PermissionCheckbox({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
        checked
          ? "bg-primary-light/40 border-primary/40 text-text-primary"
          : "bg-bg-surface border-border text-text-muted hover:border-border-focus"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
          checked ? "bg-primary border-primary text-text-light" : "border-border bg-bg-card"
        }`}
      >
        {checked && <Check className="w-3 h-3 stroke-[3]" />}
      </div>
      <div>
        <div className="text-xs font-semibold text-text-primary leading-tight">{label}</div>
        <div className="text-[10px] text-text-secondary leading-normal">{description}</div>
      </div>
    </button>
  );
}
