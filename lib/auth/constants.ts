import type { DemoAccount, PortalRole } from "./types.ts";

/**
 * Pre-configured demo accounts for fast evaluation, testing, and role switching
 * Replicates the accounts and credentials defined in mockup/index.html
 */
export const DEMO_ADMIN_ACCOUNT: DemoAccount = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Carlos Rodriguez",
  label: "Admin",
  email: "admin@swift.local",
  role: "admin",
  staffRole: "admin",
  targetUrl: "/admin",
  buttonLabel: "Use Admin",
  defaultPassword: "admin123••••••••",
  pin: "8888",
};

export const DEMO_STAFF_ACCOUNTS: DemoAccount[] = [
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Mike Morales",
    label: "Cashier",
    email: "cashier@swift.local",
    role: "staff",
    staffRole: "cashier",
    targetUrl: "/staff/pos",
    buttonLabel: "Use Cashier",
    defaultPassword: "staff123••••••••",
    pin: "1234",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Dante Reyes",
    label: "Mechanic",
    email: "mechanic1@swift.local",
    role: "staff",
    staffRole: "mechanic",
    targetUrl: "/staff/compat",
    buttonLabel: "Use Mechanic",
    defaultPassword: "staff123••••••••",
    pin: "2222",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Rico Santos",
    label: "Inventory Clerk",
    email: "warehouse@swift.local",
    role: "staff",
    staffRole: "inventory_clerk",
    targetUrl: "/staff/search",
    buttonLabel: "Use Clerk",
    defaultPassword: "staff123••••••••",
    pin: "3333",
  },
];

export const ALL_DEMO_ACCOUNTS: DemoAccount[] = [
  DEMO_ADMIN_ACCOUNT,
  ...DEMO_STAFF_ACCOUNTS,
];

export const DEMO_ACCOUNTS: Record<PortalRole, DemoAccount> = {
  admin: DEMO_ADMIN_ACCOUNT,
  staff: DEMO_STAFF_ACCOUNTS[0],
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
