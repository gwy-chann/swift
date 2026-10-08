"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { getStaffViewTitle, DEFAULT_STAFF_SHIFT } from "@/lib/staff/navigation";
import { ShiftDurationTimer } from "./shift-duration-timer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, ShieldCheck, Monitor } from "lucide-react";

interface StaffTopbarProps {
  onMenuToggle: () => void;
  onOpenAdminSwitch: () => void;
}

export function StaffTopbar({ onMenuToggle, onOpenAdminSwitch }: Readonly<StaffTopbarProps>) {
  const pathname = usePathname();
  const currentTitle = getStaffViewTitle(pathname);

  return (
    <header className="h-16 bg-bg-surface border-b border-border px-4 lg:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
      {/* Left Area: Hamburger (mobile) + View Title & Station info */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open staff navigation menu"
          className="md:hidden p-2 rounded-md hover:bg-bg-hover text-text-primary transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base lg:text-lg font-bold text-text-primary tracking-tight">
            {currentTitle}
          </h2>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-text-muted">
            <Monitor className="w-3 h-3 text-secondary" />
            <span>{DEFAULT_STAFF_SHIFT.terminalId}</span>
          </div>
        </div>
      </div>

      {/* Right Area: Shift duration, theme toggle & Admin Portal Access */}
      <div className="flex items-center gap-2.5 lg:gap-4">
        {/* Shift Duration Timer */}
        <div className="px-2.5 py-1 rounded-md bg-bg-base border border-border">
          <ShiftDurationTimer initialSeconds={DEFAULT_STAFF_SHIFT.initialElapsedSeconds} />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Admin Portal Switch Trigger */}
        <button
          type="button"
          onClick={onOpenAdminSwitch}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-md bg-secondary hover:bg-secondary-hover text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Admin Portal Access</span>
          <span className="sm:hidden">Admin</span>
        </button>
      </div>
    </header>
  );
}
