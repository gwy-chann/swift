import type { DbUserRole } from "@/lib/types/auth";
import type { StaffNavItem } from "@/lib/staff/types";

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
    targetPath: "/staff/compat",
    notificationMessage: "Redirected: Your profile is scoped to workshop repair tools.",
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
