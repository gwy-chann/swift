export type UserRole = 'Admin' | 'Cashier' | 'Mechanic' | 'Inventory Clerk';

export interface UserSession {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  permissions: string;
}
