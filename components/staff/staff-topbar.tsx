"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getStaffViewTitle, DEFAULT_STAFF_SHIFT } from "@/lib/staff/navigation";
import { ShiftDurationTimer } from "./shift-duration-timer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, Monitor, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { usePunchStore } from "@/lib/store/punch-store";

interface StaffTopbarProps {
  onMenuToggle: () => void;
  onOpenAdminSwitch?: () => void;
}

export function StaffTopbar({ onMenuToggle }: Readonly<StaffTopbarProps>) {
  const pathname = usePathname();
  const currentTitle = getStaffViewTitle(pathname);
  const { totals } = useCartStore();
  const cartItemCount = totals?.itemCount ?? 0;
  const { currentStaffRole } = usePunchStore();
  const canAccessPos = currentStaffRole === "cashier" || currentStaffRole === "admin";

  return (
    <header className="h-16 bg-bg-surface border-b border-border px-4 lg:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 print:hidden">
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

      {/* Right Area: Shift duration, theme toggle, POS cart indicator */}
      <div className="flex items-center gap-2.5 lg:gap-4">
        {/* Quick-Access POS Cart Badge */}
        {canAccessPos && cartItemCount > 0 && (
          <Link
            href="/staff/pos"
            aria-label={`View active POS Cart with ${cartItemCount} items`}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-md bg-primary-light border border-primary-border text-primary hover:bg-primary hover:text-white text-xs font-bold shadow-xs transition-all duration-150 cursor-pointer animate-in fade-in"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="font-mono text-xs font-black">{cartItemCount}</span>
            <span className="hidden md:inline text-[11px] font-semibold">in Cart</span>
          </Link>
        )}

        {/* Shift Duration Timer */}
        <div className="px-2.5 py-1 rounded-md bg-bg-base border border-border">
          <ShiftDurationTimer initialSeconds={DEFAULT_STAFF_SHIFT.initialElapsedSeconds} />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
