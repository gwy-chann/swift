import React from "react";
import { Boxes } from "lucide-react";

export default function AdminInventoryPage() {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
          <Boxes className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Inventory & Warehouse Stock</h2>
          <p className="text-xs text-text-secondary">
            Master parts catalog, warehouse shelf locator mapping, and stock adjustments.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-lg bg-bg-card border border-border text-center">
        <p className="text-sm font-semibold text-text-primary">
          📦 Inventory & Warehouse Rack Management Module (EPIC-2)
        </p>
        <p className="text-xs text-text-muted mt-1">
          Scheduled for implementation under Jira stories SIAA-13 through SIAA-17.
        </p>
      </div>
    </div>
  );
}
