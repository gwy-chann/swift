"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_NAV_ITEMS, DEFAULT_ADMIN_USER } from "@/lib/admin/navigation";
import { NavCategory } from "@/lib/admin/types";
import { NavMenuItem } from "./nav-menu-item";
import { logoutAction } from "@/lib/auth/actions";
import { Wrench, LogOut, Loader2 } from "lucide-react";

interface AdminSidebarProps {
  onItemClick?: () => void;
  className?: string;
}

export function AdminSidebar({ onItemClick, className = "" }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const categories: NavCategory[] = ["Store Intelligence", "Administration"];

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const result = await logoutAction();
      router.push(result.redirectTo);
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/login");
    }
  }

  function isItemActive(href: string): boolean {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`w-64 bg-bg-sidebar text-text-light flex flex-col justify-between shrink-0 h-screen border-r border-border-subtle ${className}`}
    >
      {/* Brand Header */}
      <div>
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white shadow-xs">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-lg font-black tracking-wider text-white">SWIFT</span>
          </Link>
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-primary/20 text-primary-border border border-primary/30 uppercase tracking-widest">
            ADMIN
          </span>
        </div>

        {/* Categorized Navigation Menu */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
          {categories.map((category) => {
            const items = ADMIN_NAV_ITEMS.filter((item) => item.category === category);
            return (
              <div key={category} className="space-y-1.5">
                <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  {category}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavMenuItem
                      key={item.id}
                      item={item}
                      isActive={isItemActive(item.href)}
                      onClick={onItemClick}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Logout Footer */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
            {DEFAULT_ADMIN_USER.avatarInitials}
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">
              {DEFAULT_ADMIN_USER.name}
            </div>
            <div className="text-[11px] text-text-muted font-medium">
              {DEFAULT_ADMIN_USER.role}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoggingOut}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-semibold text-text-light/80 hover:text-white bg-white/5 hover:bg-danger/20 hover:text-danger hover:border-danger/30 border border-white/10 transition-colors cursor-pointer"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out Account</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
