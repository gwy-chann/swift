import React from "react";
import { listStaffUsersAction } from "@/lib/admin/user-actions";
import { UserLedgerTable } from "@/components/admin/users/user-ledger-table";

export const metadata = {
  title: "User Account Management & RBAC | SWIFT Admin",
  description: "Employee account provisioning, access permissions, and role assignment.",
};

export default async function AdminUsersPage() {
  const staffUsers = await listStaffUsersAction();

  return (
    <div id="view-users" className="animate-fadeIn">
      {/* Main Ledger Table Component with integrated search bar, KPI cards, and staff ledger */}
      <UserLedgerTable initialUsers={staffUsers} />
    </div>
  );
}

