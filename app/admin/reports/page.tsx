import React from "react";
import { BarChart3 } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Reports & Financial Analytics</h2>
          <p className="text-xs text-text-secondary">
            7-day revenue trend comparison, bay labor utilization, and categorized P&L COGS engine.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-lg bg-bg-card border border-border text-center">
        <p className="text-sm font-semibold text-text-primary">
          📊 Executive Analytics & Revenue Reports (EPIC-6)
        </p>
        <p className="text-xs text-text-muted mt-1">
          Scheduled for implementation under Jira stories SIAA-33 through SIAA-37.
        </p>
      </div>
    </div>
  );
}
