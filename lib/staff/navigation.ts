import {
  Zap,
  PackageSearch,
  Wrench,
  Barcode,
  History,
  Clock,
  ClipboardList,
} from "lucide-react";
import type { DbUserRole } from "../types/auth.ts";
import type { StaffNavItem, StaffUserProfile, StaffShiftState } from "./types.ts";

/**
 * Route redirection descriptor for role-based navigation guards
 */
export interface RoleRouteRedirection {
  targetPath: string;
  notificationMessage: string;
  isAuthorizedForPos: boolean;
}

/**
 * Authoritative role routing configuration for the Staff Terminal
 */
export const ROLE_ROUTE_CONFIG: Record<DbUserRole, RoleRouteRedirection> = {
  mechanic: {
    targetPath: "/staff/work-orders",
    notificationMessage: "Redirected: Your profile is scoped to the workshop work order queue.",
    isAuthorizedForPos: false,
  },
  inventory_clerk: {
    targetPath: "/staff/search",
    notificationMessage: "Redirected: Your profile is scoped to inventory management tools.",
    isAuthorizedForPos: false,
  },
  cashier: {
    targetPath: "/staff/pos",
    notificationMessage: "Authorized access.",
    isAuthorizedForPos: true,
  },
  admin: {
    targetPath: "/staff/pos",
    notificationMessage: "Authorized access.",
    isAuthorizedForPos: true,
  },
  staff: {
    targetPath: "/staff/clock",
    notificationMessage: "Redirected: Your profile is scoped to attendance and clock tools.",
    isAuthorizedForPos: false,
  },
};

/**
 * Authoritative navigation items for Staff Shop Floor Portal
 * Replicates the menu items and categories from mockup/staff.html
 */
export const STAFF_NAV_ITEMS: StaffNavItem[] = [
  {
    id: "pos",
    label: "Fast-Lane POS",
    href: "/staff/pos",
    category: "Shop Floor Operations",
    icon: Zap,
    allowedRoles: ["cashier", "admin"],
  },
  {
    id: "work-orders",
    label: "Work Order Queue",
    href: "/staff/work-orders",
    category: "Shop Floor Operations",
    icon: ClipboardList,
    allowedRoles: ["mechanic", "admin"],
  },
  {
    id: "search",
    label: "Stock & Shelf Finder",
    href: "/staff/search",
    category: "Shop Floor Operations",
    icon: PackageSearch,
    allowedRoles: ["cashier", "mechanic", "inventory_clerk", "admin", "staff"],
  },
  {
    id: "compat",
    label: "Model Fitment Search",
    href: "/staff/compat",
    category: "Shop Floor Operations",
    icon: Wrench,
    allowedRoles: ["mechanic", "cashier", "admin", "staff"],
  },
  {
    id: "pricecheck",
    label: "Item Code Price Check",
    href: "/staff/pricecheck",
    category: "Shop Floor Operations",
    icon: Barcode,
    allowedRoles: ["inventory_clerk", "admin"],
  },
  {
    id: "history",
    label: "Purchase History",
    href: "/staff/history",
    category: "Shop Floor Operations",
    icon: History,
    allowedRoles: ["cashier", "admin"],
  },
  {
    id: "clock",
    label: "Punch Clock",
    href: "/staff/clock",
    category: "Shop Floor Operations",
    badge: {
      text: "OFF SHIFT",
      variant: "info",
    },
    icon: Clock,
    allowedRoles: ["cashier", "mechanic", "inventory_clerk", "admin", "staff"],
  },
];

/**
 * Pure evaluator for navigation item visibility based on staff role
 */
export function filterNavItemsByRole(
  items: StaffNavItem[],
  role: string | undefined
): StaffNavItem[] {
  if (!role) return items;
  const normalizedRole = role.toLowerCase() as DbUserRole;
  return items.filter((item) => {
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
    return item.allowedRoles.includes(normalizedRole);
  });
}

/**
 * Determines primary route and notification message for non-authorized roles
 */
export function getRolePrimaryRoute(role: string | undefined): RoleRouteRedirection {
  if (!role) {
    return {
      targetPath: "/staff/clock",
      notificationMessage: "Redirected: Please select your active staff profile.",
      isAuthorizedForPos: false,
    };
  }

  const normalized = role.toLowerCase() as DbUserRole;
  return (
    ROLE_ROUTE_CONFIG[normalized] || {
      targetPath: "/staff/clock",
      notificationMessage: "Redirected: Your profile is scoped to attendance and clock tools.",
      isAuthorizedForPos: false,
    }
  );
}

/**
 * Default staff user profile displayed in sidebar footer
 */
export const DEFAULT_STAFF_USER: StaffUserProfile = {
  id: "00000000-0000-0000-0000-000000000002",
  name: "Mike Morales",
  role: "Cashier / Floor Staff",
  avatarInitials: "MM",
  email: "staff@swift.local",
};

/**
 * Default staff shift state
 */
export const DEFAULT_STAFF_SHIFT: StaffShiftState = {
  terminalId: "Terminal #01 - Shop Floor",
  employeeName: "Mike Morales",
  role: "Cashier / Floor Staff",
  initialElapsedSeconds: 0,
  isOnShift: false,
};

/**
 * Derives current view title dynamically from pathname
 */
export function getStaffViewTitle(pathname: string): string {
  if (!pathname || pathname === "/staff" || pathname === "/staff/pos") {
    return "Fast-Lane POS";
  }

  const matchingItem = STAFF_NAV_ITEMS.find((item) => pathname.startsWith(item.href));
  return matchingItem ? matchingItem.label : "Shop Floor Terminal";
}
