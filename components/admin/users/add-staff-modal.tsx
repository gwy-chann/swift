"use client";

import React, { useState } from "react";
import { X, UserPlus, Shield, Check, AlertCircle } from "lucide-react";
import type { DbUserRole, StaffPermissions } from "@/lib/types/auth";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/types/auth";
import type { StaffUserSummary } from "@/specs/030-supabase-rbac-extension-granular-permission-flags/contracts/rbac-permissions.contract";
import { provisionStaffUserAction } from "@/lib/admin/user-actions";

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffAdded: (newUser: StaffUserSummary) => void;
}

const ROLE_OPTIONS: { label: string; value: DbUserRole }[] = [
  { label: "Inventory Clerk", value: "inventory_clerk" },
  { label: "Cashier", value: "cashier" },
  { label: "Mechanic", value: "mechanic" },
  { label: "Staff", value: "staff" },
  { label: "Admin", value: "admin" },
];

export function AddStaffModal({ isOpen, onClose, onStaffAdded }: AddStaffModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<DbUserRole>("inventory_clerk");
  const [permissions, setPermissions] = useState<StaffPermissions>({
    ...DEFAULT_ROLE_PERMISSIONS.inventory_clerk,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRoleChange = (selectedRole: DbUserRole) => {
    setRole(selectedRole);
    setPermissions({
      ...DEFAULT_ROLE_PERMISSIONS[selectedRole],
    });
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

    if (!fullName.trim() || !email.trim()) {
      setErrorMsg("Full name and email address are required.");
      return;
    }

    setLoading(true);

    try {
      const result = await provisionStaffUserAction({
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        permissions,
      });

      if (!result.success || !result.data) {
        setErrorMsg(result.error || "Failed to provision staff account.");
        setLoading(false);
        return;
      }

      onStaffAdded(result.data);
      onClose();
      // Reset state
      setFullName("");
      setEmail("");
      setRole("inventory_clerk");
      setPermissions({ ...DEFAULT_ROLE_PERMISSIONS.inventory_clerk });
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
      aria-labelledby="add-staff-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-light text-primary flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="add-staff-modal-title" className="text-base font-bold text-text-primary">
                Provision New Employee
              </h3>
              <p className="text-xs text-text-secondary">
                Assign roles and database-enforced permissions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-danger-light border border-danger/30 text-danger rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="staff-full-name" className="block text-xs font-semibold text-text-primary mb-1">
              Full Name
            </label>
            <input
              id="staff-full-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Maria Santos"
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="staff-email" className="block text-xs font-semibold text-text-primary mb-1">
              Store Email Address
            </label>
            <input
              id="staff-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. maria@swift.local"
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label htmlFor="staff-role" className="block text-xs font-semibold text-text-primary mb-1">
              Operational Role
            </label>
            <select
              id="staff-role"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as DbUserRole)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Granular Permission Flags */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Granular Permissions
              </span>
            </div>

            <div className="space-y-2 bg-bg-surface/50 border border-border rounded-xl p-3">
              {/* Stock Adjustments */}
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-text-primary font-medium">Stock Adjustments & Counts</span>
                <input
                  type="checkbox"
                  checked={permissions.can_adjust_stock}
                  onChange={() => handlePermissionToggle("can_adjust_stock")}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
              </label>

              {/* POS Discount Overrides */}
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-text-primary font-medium">POS Discount Threshold Overrides</span>
                <input
                  type="checkbox"
                  checked={permissions.can_override_discount}
                  onChange={() => handlePermissionToggle("can_override_discount")}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
              </label>

              {/* Pricing Rules */}
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-text-primary font-medium">Pricing & Labor Rates Management</span>
                <input
                  type="checkbox"
                  checked={permissions.can_manage_pricing}
                  onChange={() => handlePermissionToggle("can_manage_pricing")}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
              </label>

              {/* Reports */}
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-text-primary font-medium">Sales & Attendance Audit Reports</span>
                <input
                  type="checkbox"
                  checked={permissions.can_view_reports}
                  onChange={() => handlePermissionToggle("can_view_reports")}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-text-light text-xs font-bold hover:bg-primary-hover shadow-sm transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "Provisioning..." : "Create Staff Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
