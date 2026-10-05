"use client";

import React from "react";
import { DEMO_ACCOUNTS } from "@/lib/auth/constants";
import { DemoAccount } from "@/lib/auth/types";
import { KeyRound } from "lucide-react";

interface DemoCredentialsBoxProps {
  onSelectDemo: (account: DemoAccount) => void;
  disabled?: boolean;
}

/**
 * Demo system accounts quick-fill box
 * Replicates the quick-fill triggers and layout from mockup/index.html
 */
export function DemoCredentialsBox({
  onSelectDemo,
  disabled = false,
}: DemoCredentialsBoxProps) {
  return (
    <div className="mt-6 p-4 rounded-md bg-bg-muted border border-border text-xs">
      <div className="flex items-center gap-1.5 font-bold text-text-primary mb-3 text-xs tracking-wide">
        <KeyRound className="w-3.5 h-3.5 text-primary" />
        <span>Demo System Accounts:</span>
      </div>

      <div className="space-y-2">
        {/* Admin Account Row */}
        <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-bg-card border border-border-subtle">
          <div className="truncate">
            <span className="font-semibold text-text-primary">Admin: </span>
            <code className="text-text-secondary font-mono">{DEMO_ACCOUNTS.admin.email}</code>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectDemo(DEMO_ACCOUNTS.admin)}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-primary-light text-primary hover:bg-primary hover:text-white border border-primary-border transition-colors cursor-pointer shrink-0"
          >
            {DEMO_ACCOUNTS.admin.buttonLabel}
          </button>
        </div>

        {/* Staff Account Row */}
        <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-bg-card border border-border-subtle">
          <div className="truncate">
            <span className="font-semibold text-text-primary">Staff: </span>
            <code className="text-text-secondary font-mono">{DEMO_ACCOUNTS.staff.email}</code>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectDemo(DEMO_ACCOUNTS.staff)}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-bg-hover text-text-primary hover:bg-secondary hover:text-white border border-border transition-colors cursor-pointer shrink-0"
          >
            {DEMO_ACCOUNTS.staff.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
