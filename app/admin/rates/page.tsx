import React from "react";
import { Tags } from "lucide-react";

export default function AdminRatesPage() {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
          <Tags className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Pricing & Labor Rates Matrix</h2>
          <p className="text-xs text-text-secondary">
            Global markup rules, wholesale discounts, and flat-rate service labor schedules.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-lg bg-bg-card border border-border text-center">
        <p className="text-sm font-semibold text-text-primary">
          🏷️ Global Markup & Labor Schedule Configuration (EPIC-7)
        </p>
        <p className="text-xs text-text-muted mt-1">
          Scheduled for implementation under Jira stories SIAA-39 and SIAA-40.
        </p>
      </div>
    </div>
  );
}
