import React from "react";
import { Users } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">User Account Management & RBAC</h2>
          <p className="text-xs text-text-secondary">
            Employee account provisioning, access permissions, and role assignment.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-lg bg-bg-card border border-border text-center">
        <p className="text-sm font-semibold text-text-primary">
          👥 User Account Provisioning & RBAC (EPIC-7)
        </p>
        <p className="text-xs text-text-muted mt-1">
          Scheduled for implementation under Jira story SIAA-38.
        </p>
      </div>
    </div>
  );
}
