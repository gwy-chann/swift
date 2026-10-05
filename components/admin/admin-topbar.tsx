"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAdminViewTitle } from "@/lib/admin/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, ArrowRightLeft } from "lucide-react";

interface AdminTopbarProps {
  onOpenMobileMenu?: () => void;
}

export function AdminTopbar({ onOpenMobileMenu }: AdminTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = getAdminViewTitle(pathname);

  function handleSwitchPortal() {
    router.push("/staff/pos");
  }

  return (
    <header className="h-16 px-4 sm:px-6 bg-bg-surface border-b border-border flex items-center justify-between shrink-0 sticky top-0 z-10 select-none">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-md hover:bg-bg-hover text-text-primary border border-border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-text-primary truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Terminal Live Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-light border border-success/30 text-xs text-text-primary">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
          <span className="font-bold text-success text-[11px]">[ONLINE]</span>
          <span className="text-text-secondary text-[11px] font-medium">Terminal #01</span>
        </div>

        {/* Switch Portal Button */}
        <button
          type="button"
          onClick={handleSwitchPortal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-white text-xs font-semibold hover:bg-secondary-hover active:scale-[0.98] transition-all cursor-pointer shadow-xs"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Switch to Staff Portal</span>
          <span className="sm:hidden">Staff POS</span>
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}
