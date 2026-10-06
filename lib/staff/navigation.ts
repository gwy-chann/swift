import {
  Zap,
  PackageSearch,
  Wrench,
  Barcode,
  Clock,
} from "lucide-react";
import { StaffNavItem, StaffUserProfile, StaffShiftState } from "./types";

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
  },
  {
    id: "search",
    label: "Stock & Shelf Finder",
    href: "/staff/search",
    category: "Shop Floor Operations",
    icon: PackageSearch,
  },
  {
    id: "compat",
    label: "Model Fitment Search",
    href: "/staff/compat",
    category: "Shop Floor Operations",
    icon: Wrench,
  },
  {
    id: "pricecheck",
    label: "Item Code Price Check",
    href: "/staff/pricecheck",
    category: "Shop Floor Operations",
    icon: Barcode,
  },
  {
    id: "clock",
    label: "Punch Clock",
    href: "/staff/clock",
    category: "Shop Floor Operations",
    badge: {
      text: "ON SHIFT",
      variant: "success",
    },
    icon: Clock,
  },
];

/**
 * Default staff user profile displayed in sidebar footer
 */
export const DEFAULT_STAFF_USER: StaffUserProfile = {
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
  initialElapsedSeconds: 15150, // 04:12:30 in seconds
  isOnShift: true,
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
