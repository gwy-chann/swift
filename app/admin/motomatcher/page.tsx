import React from "react";
import { Search } from "lucide-react";

export default function AdminMotoMatcherPage() {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">MotoMatcher Compatibility Search</h2>
          <p className="text-xs text-text-secondary">
            Motorcycle make, model, displacement selector and OEM vs aftermarket comparison.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-lg bg-bg-card border border-border text-center">
        <p className="text-sm font-semibold text-text-primary">
          🏍️ Smart MotoMatcher Engine (EPIC-4)
        </p>
        <p className="text-xs text-text-muted mt-1">
          Scheduled for implementation under Jira stories SIAA-23 through SIAA-27.
        </p>
      </div>
    </div>
  );
}
