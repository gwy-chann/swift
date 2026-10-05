import React from "react";
import { ShieldCheck } from "lucide-react";

export default function AdminLogsPage() {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">System Settings & Audit Logs</h2>
          <p className="text-xs text-text-secondary">
            Immutable stock adjustment audit trails, terminal security session logs, and system configuration.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-lg bg-bg-card border border-border text-center">
        <p className="text-sm font-semibold text-text-primary">
          🛡️ System Security & Audit Activity Logging (EPIC-7)
        </p>
        <p className="text-xs text-text-muted mt-1">
          Scheduled for implementation under Jira stories SIAA-41 and SIAA-42.
        </p>
      </div>
    </div>
  );
}
