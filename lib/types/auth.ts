export type DbUserRole = 'admin' | 'staff' | 'cashier' | 'mechanic' | 'inventory_clerk';

export type UserRole = 'Admin' | 'Cashier' | 'Mechanic' | 'Staff' | 'Inventory Clerk';

export interface StaffPermissions {
  can_adjust_stock: boolean;
  can_override_discount: boolean;
  can_manage_pricing: boolean;
  can_view_reports: boolean;
}

export const DEFAULT_STAFF_PERMISSIONS: Readonly<StaffPermissions> = {
  can_adjust_stock: false,
  can_override_discount: false,
  can_manage_pricing: false,
  can_view_reports: false,
};

export const DEFAULT_ROLE_PERMISSIONS: Record<DbUserRole, StaffPermissions> = {
  admin: {
    can_adjust_stock: true,
    can_override_discount: true,
    can_manage_pricing: true,
    can_view_reports: true,
  },
  inventory_clerk: {
    can_adjust_stock: true,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
  cashier: {
    can_adjust_stock: false,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
  mechanic: {
    can_adjust_stock: false,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
  staff: {
    can_adjust_stock: false,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
};

export function mapDbRoleToDisplay(role: DbUserRole): UserRole {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'cashier':
      return 'Cashier';
    case 'mechanic':
      return 'Mechanic';
    case 'inventory_clerk':
      return 'Inventory Clerk';
    case 'staff':
    default:
      return 'Staff';
  }
}

export interface UserSession {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  permissions: string | StaffPermissions;
}

export interface UserProfileRecord {
  id: string;
  email: string;
  fullName: string | null;
  role: DbUserRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  permissions: StaffPermissions;
  createdAt: string;
  updatedAt: string;
}
