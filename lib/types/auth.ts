export type DbUserRole = 'admin' | 'staff' | 'cashier' | 'mechanic';

export type UserRole = 'Admin' | 'Cashier' | 'Mechanic' | 'Staff' | 'Inventory Clerk';

export interface UserSession {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  permissions: string;
}

export interface UserProfileRecord {
  id: string;
  email: string;
  fullName: string | null;
  role: DbUserRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  createdAt: string;
  updatedAt: string;
}
