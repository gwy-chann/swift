import { DemoAccount, PortalRole } from "./types";

/**
 * Pre-configured demo accounts for fast evaluation, testing, and role switching
 * Replicates the accounts and credentials defined in mockup/index.html
 */
export const DEMO_ACCOUNTS: Record<PortalRole, DemoAccount> = {
  admin: {
    label: "Admin",
    email: "admin@swift.local",
    role: "admin",
    targetUrl: "/admin",
    buttonLabel: "Use Admin",
    defaultPassword: "admin123••••••••",
  },
  staff: {
    label: "Staff",
    email: "cashier@swift.local",
    role: "staff",
    targetUrl: "/staff/pos",
    buttonLabel: "Use Staff",
    defaultPassword: "staff123••••••••",
  },
};

/**
 * Portal configuration metadata
 */
export const PORTAL_CONFIG = {
  admin: {
    title: "Admin Portal",
    submitLabel: "Access Admin Portal",
    defaultRoute: "/admin",
    demoAccount: DEMO_ACCOUNTS.admin,
  },
  staff: {
    title: "Staff Portal",
    submitLabel: "Access Staff Fast-Lane POS",
    defaultRoute: "/staff/pos",
    demoAccount: DEMO_ACCOUNTS.staff,
  },
} as const;

export const TERMINAL_ROLE_STORAGE_KEY = "swift_terminal_role";
