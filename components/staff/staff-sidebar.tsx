"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  STAFF_NAV_ITEMS,
  DEFAULT_STAFF_USER,
  filterNavItemsByRole,
  getRolePrimaryRoute,
} from "@/lib/staff/navigation";
import { StaffNavItemComponent } from "./staff-nav-item";
import { logoutAction } from "@/lib/auth/actions";
import { clockOutShiftAction } from "@/lib/staff/actions";
import { LogOut, Loader2 } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { usePunchStore } from "@/lib/store/punch-store";
import { mapDbRoleToDisplay, type DbUserRole } from "@/lib/types/auth";

interface StaffSidebarProps {
  onItemClick?: () => void;
  className?: string;
}

function getClockBadge(isShiftActive: boolean, shiftStatus: string) {
  if (!isShiftActive) {
    return { text: "OFF SHIFT", variant: "info" as const };
  }
  if (shiftStatus === "break") {
    return { text: "ON BREAK", variant: "warning" as const };
  }
  return { text: "ON SHIFT", variant: "success" as const };
}

export function StaffSidebar({ onItemClick, className = "" }: Readonly<StaffSidebarProps>) {

  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { totals } = useCartStore();
  const cartItemCount = totals?.itemCount ?? 0;
  const {
    isShiftActive,
    shiftStatus,
    currentStaff,
    currentStaffRole,
    currentProfileId,
    activeShiftId,
    clockOut,
    resetShiftOnLogout,
  } = usePunchStore();

  const visibleNavItems = filterNavItemsByRole(STAFF_NAV_ITEMS, currentStaffRole);
  const primaryRoute = getRolePrimaryRoute(currentStaffRole);
  const homeHref = primaryRoute.isAuthorizedForPos ? "/staff/pos" : primaryRoute.targetPath;

  const displayName = currentStaff || DEFAULT_STAFF_USER.name;
  const displayRole = currentStaffRole
    ? mapDbRoleToDisplay(currentStaffRole.toLowerCase() as DbUserRole)
    : DEFAULT_STAFF_USER.role;
  const avatarInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || DEFAULT_STAFF_USER.avatarInitials;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      if (isShiftActive) {
        try {
          const shiftId = activeShiftId || "";
          clockOut(displayName, currentProfileId);
          await clockOutShiftAction(shiftId, "Auto clock-out on staff logout", currentProfileId);
        } catch (clockErr) {
          console.warn("Auto clock-out on logout error:", clockErr);
        }
      }
      resetShiftOnLogout(currentProfileId);
      const result = await logoutAction();
      router.push(result.redirectTo);
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/");
    }
  }

  function isItemActive(href: string): boolean {
    if (href === "/staff/pos" || href === "/staff") {
      return pathname === "/staff" || pathname === "/staff/pos";
    }
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`w-58 bg-bg-sidebar text-text-light flex flex-col justify-between shrink-0 h-screen border-r border-border-subtle ${className}`}
    >
      {/* Brand Header */}
      <div>
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <Link href={homeHref} className="flex items-center">
            <span className="text-lg font-black tracking-wider text-white">SWIFT</span>
          </Link>
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-secondary text-white uppercase tracking-widest shadow-xs">
            STAFF
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]">
          <div className="space-y-1.5">
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Shop Floor Operations
            </div>
            <div className="space-y-0.5">
              {visibleNavItems.map((item) => {
                let itemWithBadge = item;

                if (item.id === "pos" && cartItemCount > 0) {
                  itemWithBadge = {
                    ...item,
                    badge: {
                      text: String(cartItemCount),
                      variant: "primary" as const,
                    },
                  };
                } else if (item.id === "clock") {
                  itemWithBadge = {
                    ...item,
                    badge: getClockBadge(isShiftActive, shiftStatus),
                  };
                }

                return (
                  <StaffNavItemComponent
                    key={item.id}
                    item={itemWithBadge}
                    isActive={isItemActive(item.href)}
                    onClick={onItemClick}
                  />
                );
              })}

            </div>
          </div>
        </nav>
      </div>

      {/* User Profile & Logout Footer */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-info flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
            {avatarInitials}
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">
              {displayName}
            </div>
            <div className="text-[11px] text-text-muted font-medium truncate">
              {displayRole}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoggingOut}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-semibold text-text-light/80 bg-white/5 hover:bg-danger/20 hover:text-danger hover:border-danger/30 border border-white/10 transition-colors cursor-pointer"
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
