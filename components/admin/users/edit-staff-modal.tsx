"use client";

import React, { useState } from "react";
import { X, UserCheck, AlertCircle } from "lucide-react";
import type { DbUserRole, StaffPermissions } from "@/lib/types/auth";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/types/auth";
import type { StaffUserSummary } from "@/specs/031-user-account-provisioning-rbac-management/contracts/user-management.contract";
import { updateStaffUserAction } from "@/lib/admin/user-actions";
import { punchStore } from "@/lib/store/punch-store";

interface EditStaffModalProps {
  isOpen: boolean;
  user: StaffUserSummary | null;
  onClose: () => void;
  onStaffUpdated: (updatedUser: StaffUserSummary) => void;
}

const ROLE_OPTIONS: { label: string; value: DbUserRole }[] = [
  { label: "Admin", value: "admin" },
  { label: "Inventory Clerk", value: "inventory_clerk" },
  { label: "Cashier", value: "cashier" },
  { label: "Mechanic", value: "mechanic" },
];

export function EditStaffModal({
  isOpen,
  user,
  onClose,
  onStaffUpdated,
}: Readonly<EditStaffModalProps>) {
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

interface EditStaffModalDialogProps {
  user: StaffUserSummary;
  onClose: () => void;
  onStaffUpdated: (updatedUser: StaffUserSummary) => void;
}

function EditStaffModalDialog({
  user,
  onClose,
  onStaffUpdated,
}: Readonly<EditStaffModalDialogProps>) {
  const [fullName, setFullName] = useState(user.fullName);
  const [role, setRole] = useState<DbUserRole>(user.role);
  const [permissions, setPermissions] = useState<StaffPermissions>({
    ...user.permissions,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRoleChange = (selectedRole: DbUserRole) => {
    setRole(selectedRole);
    const defaults = DEFAULT_ROLE_PERMISSIONS[selectedRole];
    if (defaults) {
      setPermissions(defaults);
    }
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

      try {
        punchStore.syncStaffRole(result.data.id, result.data.role, result.data.permissions);
      } catch {
        // Ignore punchStore sync if running outside client storage context
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
    <dialog
      open
      aria-modal="true"
      aria-labelledby="edit-staff-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs border-0 m-0 w-full h-full max-w-none max-h-none animate-fadeIn"
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

          {/* Employee ID (Auto-Assigned, Read-Only) */}
          <div className="space-y-1">
            <label htmlFor="edit-staff-employee-id" className="text-xs font-semibold text-text-secondary">
              Employee ID (Auto-Assigned)
            </label>
            <input
              id="edit-staff-employee-id"
              data-testid="input-edit-staff-employee-id"
              type="text"
              readOnly
              disabled
              value={user.employeeId || "—"}
              className="w-full px-3.5 py-2 rounded-xl bg-bg-muted border border-border text-xs text-text-muted font-mono cursor-not-allowed"
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
            <p className="text-[11px] text-text-muted mt-1.5">
              Role automatically determines system access and default workstation permissions.
            </p>
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
    </dialog>
  );
}
