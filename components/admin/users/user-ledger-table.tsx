"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Power,
  Pencil,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  UserCheck,
  Warehouse,
  ShieldCheck,
  RotateCcw,
  X,
} from "lucide-react";
import type { DbUserRole } from "@/lib/types/auth";
import type { StaffUserSummary } from "@/specs/030-supabase-rbac-extension-granular-permission-flags/contracts/rbac-permissions.contract";
import { toggleUserStatusAction } from "@/lib/admin/user-actions";
import { AddStaffModal } from "./add-staff-modal";
import { EditStaffModal } from "./edit-staff-modal";
import { ResetCredentialsModal } from "./reset-credentials-modal";
import { TablePagination, usePagination } from "@/components/common/table-pagination";

interface UserLedgerTableProps {
  initialUsers: StaffUserSummary[];
}

function parseEmpNumber(empId?: string): number {
  if (!empId) return 999999;
  const match = empId.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
}

function sortStaffUsers(staffList: StaffUserSummary[]): StaffUserSummary[] {
  return [...staffList].sort((a, b) => {
    const numA = parseEmpNumber(a.employeeId);
    const numB = parseEmpNumber(b.employeeId);
    if (numA !== numB) {
      return numA - numB;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function UserLedgerTable({ initialUsers }: Readonly<UserLedgerTableProps>) {
  const [users, setUsers] = useState<StaffUserSummary[]>(() => sortStaffUsers(initialUsers));
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUserSummary | null>(null);
  const [resettingUser, setResettingUser] = useState<StaffUserSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === "Active").length;
  const inventoryClerks = users.filter((u) => u.role === "inventory_clerk").length;
  const frontlineCashiers = users.filter((u) => u.role === "cashier").length;

  const isFiltered =
    searchQuery.trim().length > 0 ||
    roleFilter !== "all" ||
    statusFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const kpiCards = [
    {
      title: "Total Staff",
      badge: "All Accounts",
      badgeClass: "bg-primary-light text-primary border border-primary/20",
      value: totalUsers,
      subtext: "Registered system accounts",
      icon: Users,
      iconColor: "text-primary",
    },
    {
      title: "Active",
      badge: "Operational",
      badgeClass: "bg-success-light text-success border border-success/30",
      value: activeCount,
      subtext: `${activeCount} of ${totalUsers} accounts active`,
      icon: UserCheck,
      iconColor: "text-success",
    },
    {
      title: "Inventory",
      badge: "Stock Room",
      badgeClass: "bg-info-light text-info border border-info/30",
      value: inventoryClerks,
      subtext: "Warehouse & stock clerks",
      icon: Warehouse,
      iconColor: "text-info",
    },
    {
      title: "Cashiers",
      badge: "Frontline POS",
      badgeClass: "bg-accent-light text-accent border border-accent/30",
      value: frontlineCashiers,
      subtext: "Frontline payment cashiers",
      icon: ShieldCheck,
      iconColor: "text-accent",
    },
  ];

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(q));
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const pagination = usePagination(filteredUsers, 10);
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [searchQuery, roleFilter, statusFilter, resetPage]);

  const handleStaffAdded = (newUser: StaffUserSummary) => {
    setUsers((prev) => [...prev, newUser]);
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
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40";
      case "staff":
      default:
        return "bg-bg-muted text-text-secondary border-border";
    }
  };

  return (
    <div className="space-y-3">
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
            className="text-danger hover:underline text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Success Notification Alert */}
      {feedbackMsg && (
        <div
          id="user-ledger-success-banner"
          data-testid="user-ledger-success"
          className="p-3 bg-success-light border border-success/30 text-success rounded-xl text-xs flex items-center justify-between animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-success hover:underline text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Real-time Multi-attribute Search, Filters & Add Staff User Action Toolbar */}
      <div className="p-4 rounded-lg bg-bg-card border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, email, role, or ID..."
            aria-label="Search staff members"
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-bg-input text-text-primary rounded-md border border-border focus:outline-hidden focus:border-border-focus focus:ring-1 focus:ring-border-focus placeholder:text-text-muted transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search query"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Selectors Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Roles Dropdown */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by staff role"
              className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-bg-input text-text-primary rounded-md border border-border focus:outline-hidden focus:border-border-focus focus:ring-1 focus:ring-border-focus cursor-pointer transition-colors"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="inventory_clerk">Inventory Clerks</option>
              <option value="cashier">Cashiers</option>
              <option value="mechanic">Mechanics</option>
            </select>
          </div>

          {/* Account Status Dropdown */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by account status"
              className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-bg-input text-text-primary rounded-md border border-border focus:outline-hidden focus:border-border-focus focus:ring-1 focus:ring-border-focus cursor-pointer transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Reset Filter Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              aria-label="Reset all filters"
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-md bg-bg-muted hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border-subtle transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Add Staff User Button */}
          <button
            type="button"
            id="btnAddStaffUser"
            data-testid="btn-add-staff"
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Add new staff user"
            className="flex items-center justify-center px-3.5 py-2 text-xs sm:text-sm font-bold rounded-md bg-primary hover:bg-primary-hover text-text-light shadow-xs transition-all cursor-pointer shrink-0"
          >
            <span>Add Staff User</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards positioned directly below control bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className="p-4 sm:p-5 rounded-xl bg-bg-card border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 shrink-0 ${kpi.iconColor}`} />
                  <span className="text-xs font-semibold text-text-muted">
                    {kpi.title}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${kpi.badgeClass}`}
                >
                  {kpi.badge}
                </span>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                  {kpi.value}
                </div>
                <div className="text-xs font-semibold mt-1 flex items-center gap-1 text-text-secondary">
                  <span>{kpi.subtext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Container */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg-surface/50 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Role</th>
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
                pagination.paginatedItems.map((user) => {
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

                      {/* Employee ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-bg-muted text-text-secondary border border-border">
                          {user.employeeId || "—"}
                        </span>
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
                            id={`btnResetCredentials-${user.id}`}
                            data-testid={`btn-reset-credentials-${user.id}`}
                            onClick={() => setResettingUser(user)}
                            aria-label={`Reset credentials for ${user.fullName}`}
                            title="Reset Credentials"
                            className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-amber-600 hover:border-amber-500/40 hover:bg-amber-500/10 transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
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

        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          itemName="accounts"
        />
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

      {/* Reset Credentials Modal */}
      <ResetCredentialsModal
        isOpen={!!resettingUser}
        user={resettingUser}
        onClose={() => setResettingUser(null)}
        onSuccess={(msg) => {
          setFeedbackMsg(msg);
          setTimeout(() => setFeedbackMsg(null), 5000);
        }}
      />
    </div>
  );
}
