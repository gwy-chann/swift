import React from "react";
import { Users, ShieldCheck, UserCheck, Warehouse } from "lucide-react";
import { listStaffUsersAction } from "@/lib/admin/user-actions";
import { UserLedgerTable } from "@/components/admin/users/user-ledger-table";

export const metadata = {
  title: "User Account Management & RBAC | SWIFT Admin",
  description: "Employee account provisioning, access permissions, and role assignment.",
};

export default async function AdminUsersPage() {
  const staffUsers = await listStaffUsersAction();

  const totalUsers = staffUsers.length;
  const activeCount = staffUsers.filter((u) => u.status === "Active").length;
  const inventoryClerks = staffUsers.filter((u) => u.role === "inventory_clerk").length;
  const frontlineCashiers = staffUsers.filter((u) => u.role === "cashier").length;

  return (
    <div id="view-users" className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">
              User Accounts & RBAC Matrix
            </h1>
            <p className="text-xs text-text-secondary">
              Role assignment, granular operational permissions, and employee account provisioning.
            </p>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-bg-card border border-border">
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Total Staff</span>
            </div>
            <div className="text-base font-bold text-text-primary mt-0.5">
              {totalUsers}
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-bg-card border border-border">
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <UserCheck className="w-3.5 h-3.5 text-success" />
              <span>Active</span>
            </div>
            <div className="text-base font-bold text-text-primary mt-0.5">
              {activeCount}
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-bg-card border border-border">
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <Warehouse className="w-3.5 h-3.5 text-info" />
              <span>Inventory</span>
            </div>
            <div className="text-base font-bold text-text-primary mt-0.5">
              {inventoryClerks}
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-bg-card border border-border">
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Cashiers</span>
            </div>
            <div className="text-base font-bold text-text-primary mt-0.5">
              {frontlineCashiers}
            </div>
          </div>
        </div>
      </div>

      {/* Main Ledger Table Component */}
      <UserLedgerTable initialUsers={staffUsers} />
    </div>
  );
}
