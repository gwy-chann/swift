"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  UserPlus,
  Power,
  Pencil,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PackageCheck,
  Percent,
  Coins,
  FileBarChart,
} from "lucide-react";
import type { DbUserRole } from "@/lib/types/auth";
import type { StaffUserSummary } from "@/specs/030-supabase-rbac-extension-granular-permission-flags/contracts/rbac-permissions.contract";
import { toggleUserStatusAction } from "@/lib/admin/user-actions";
import { AddStaffModal } from "./add-staff-modal";
import { EditStaffModal } from "./edit-staff-modal";

interface UserLedgerTableProps {
  initialUsers: StaffUserSummary[];
}

export function UserLedgerTable({ initialUsers }: UserLedgerTableProps) {
  const [users, setUsers] = useState<StaffUserSummary[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUserSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const matchesSearch =
        !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const handleStaffAdded = (newUser: StaffUserSummary) => {
    setUsers((prev) => [newUser, ...prev]);
  };

  const handleStaffUpdated = (updatedUser: StaffUserSummary) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
  };

  const handleToggleStatus = async (user: StaffUserSummary) => {
    setActionError(null);
    setTogglingId(user.id);

    const targetStatus = user.status === "Active" ? "Inactive" : "Active";

    try {
      const result = await toggleUserStatusAction(user.id, targetStatus);
      if (!result.success || !result.data) {
        setActionError(result.error || "Unable to update account status.");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? result.data! : u))
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setTogglingId(null);
    }
  };

  const getRoleBadgeClasses = (role: DbUserRole): string => {
    switch (role) {
      case "admin":
        return "bg-primary-light text-primary border-primary/20";
      case "inventory_clerk":
        return "bg-info-light text-info border-info/30";
      case "cashier":
        return "bg-accent-light text-accent border-accent/30";
      case "mechanic":
        return "bg-secondary text-text-secondary border-border";
      case "staff":
      default:
        return "bg-bg-muted text-text-secondary border-border";
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Error Alert */}
      {actionError && (
        <div className="p-3 bg-danger-light border border-danger/30 text-danger rounded-xl text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-danger hover:underline text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search & Filter */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name or email..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-bg-surface border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary transition-colors"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-bg-surface border border-border text-xs text-text-primary focus:outline-hidden focus:border-primary transition-colors"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="inventory_clerk">Inventory Clerks</option>
            <option value="cashier">Cashiers</option>
            <option value="mechanic">Mechanics</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        {/* Add Staff Button */}
        <button
          type="button"
          id="btnAddStaffUser"
          data-testid="btn-add-staff"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-text-light text-xs font-bold hover:bg-primary-hover shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Staff User</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg-surface/50 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Granular Permissions</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="usersTableBody" className="divide-y divide-border text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted">
                    No employee accounts found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isActive = user.status === "Active";
                  const initial = user.fullName.charAt(0).toUpperCase() || "S";
                  const isBusy = togglingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-bg-hover/60 transition-colors ${
                        !isActive ? "opacity-60 bg-bg-muted/30" : ""
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-light text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-text-primary">
                              {user.fullName}
                            </div>
                            <div className="text-[11px] text-text-muted">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Pill */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getRoleBadgeClasses(
                            user.role
                          )}`}
                        >
                          {user.roleDisplay}
                        </span>
                      </td>

                      {/* Permissions Chips */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
                          <PermissionBadge
                            label="Stock In"
                            enabled={user.permissions.can_adjust_stock}
                            icon={<PackageCheck className="w-3 h-3" />}
                          />
                          <PermissionBadge
                            label="Discount Override"
                            enabled={user.permissions.can_override_discount}
                            icon={<Percent className="w-3 h-3" />}
                          />
                          <PermissionBadge
                            label="Manage Pricing"
                            enabled={user.permissions.can_manage_pricing}
                            icon={<Coins className="w-3 h-3" />}
                          />
                          <PermissionBadge
                            label="Audit Reports"
                            enabled={user.permissions.can_view_reports}
                            icon={<FileBarChart className="w-3 h-3" />}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isActive
                              ? "bg-success-light text-success border-success/30"
                              : "bg-bg-muted text-text-muted border-border"
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{user.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            id={`btnEditUser-${user.id}`}
                            data-testid={`btn-edit-user-${user.id}`}
                            onClick={() => setEditingUser(user)}
                            aria-label={`Edit ${user.fullName}`}
                            title="Edit Staff Member"
                            className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary/40 hover:bg-primary-light transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            id={`btnToggleStatus-${user.id}`}
                            data-testid={`btn-toggle-status-${user.id}`}
                            onClick={() => handleToggleStatus(user)}
                            disabled={isBusy}
                            aria-label={`Toggle status for ${user.fullName}`}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isActive
                                ? "text-danger border-border hover:bg-danger-light"
                                : "text-success border-border hover:bg-success-light"
                            } disabled:opacity-50`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStaffAdded={handleStaffAdded}
      />

      {/* Edit Staff Modal */}
      <EditStaffModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onStaffUpdated={handleStaffUpdated}
      />
    </div>
  );
}

function PermissionBadge({
  label,
  enabled,
  icon,
}: {
  label: string;
  enabled: boolean;
  icon: React.ReactNode;
}) {
  if (!enabled) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-surface border border-border text-[10px] font-medium text-text-secondary">
      {icon}
      <span>{label}</span>
    </span>
  );
}
