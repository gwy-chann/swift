import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Search,
  BarChart3,
  Users,
  Tags,
  ShieldCheck,
} from "lucide-react";
import { AdminNavItem, AdminUserMeta } from "./types";

/**
 * Authoritative navigation items for Admin Portal
 * Replicates the menu items and categories from mockup/admin.html
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // Store Intelligence
  {
    id: "dashboard",
    label: "Admin Dashboard",
    href: "/admin",
    category: "Store Intelligence",
    icon: LayoutDashboard,
  },
  {
    id: "inventory",
    label: "Inventory & Stock",
    href: "/admin/inventory",
    category: "Store Intelligence",
    badge: {
      text: "3 Low",
      variant: "danger",
    },
    icon: Boxes,
  },
  {
    id: "pos",
    label: "Point of Sale (POS)",
    href: "/admin/pos",
    category: "Store Intelligence",
    icon: ShoppingCart,
  },
  {
    id: "motomatcher",
    label: "MotoMatcher Search",
    href: "/admin/motomatcher",
    category: "Store Intelligence",
    icon: Search,
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    href: "/admin/reports",
    category: "Store Intelligence",
    icon: BarChart3,
  },

  // Administration
  {
    id: "users",
    label: "User Management",
    href: "/admin/users",
    category: "Administration",
    icon: Users,
  },
  {
    id: "pricing",
    label: "Pricing & Labor Rates",
    href: "/admin/rates",
    category: "Administration",
    icon: Tags,
  },
  {
    id: "settings",
    label: "Settings & Audit Logs",
    href: "/admin/logs",
    category: "Administration",
    icon: ShieldCheck,
  },
];

/**
 * Default admin user profile displayed in sidebar footer
 */
export const DEFAULT_ADMIN_USER: AdminUserMeta = {
  name: "Carlos Rodriguez",
  role: "System Admin",
  avatarInitials: "CR",
  email: "admin@swift.local",
};

/**
 * Derives current view title dynamically from pathname
 */
export function getAdminViewTitle(pathname: string): string {
  if (!pathname || pathname === "/admin") {
    return "Admin Dashboard";
  }

  const matchingItem = ADMIN_NAV_ITEMS.find((item) => {
    if (item.href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(item.href);
  });

  return matchingItem ? matchingItem.label : "Admin Management";
}
