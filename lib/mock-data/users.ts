import type { UserSession, StaffPermissions, DbUserRole, UserRole } from '../types/auth.ts';
import { DEFAULT_ROLE_PERMISSIONS } from '../types/auth.ts';

export const MOCK_USERS: UserSession[] = [
  {
    id: 1,
    name: 'Carlos Rodriguez',
    email: 'admin@swift.local',
    role: 'Admin',
    status: 'Active',
    permissions: 'Full Access (All Modules)'
  },
  {
    id: 2,
    name: 'Mike Morales',
    email: 'cashier@swift.local',
    role: 'Cashier',
    status: 'Active',
    permissions: 'Fast POS, Receipt, Stock Search'
  },
  {
    id: 3,
    name: 'Dante Reyes',
    email: 'mechanic1@swift.local',
    role: 'Mechanic',
    status: 'Active',
    permissions: 'Time Clock, Service Bay Queue'
  },
  {
    id: 4,
    name: 'Rico Santos',
    email: 'warehouse@swift.local',
    role: 'Inventory Clerk',
    status: 'Active',
    permissions: 'Inventory Adjustments, Stock In'
  }
];

export interface MockStaffUserProfile {
  id: string;
  name: string;
  email: string;
  role: DbUserRole;
  roleDisplay: UserRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  permissions: StaffPermissions;
  createdAt: string;
  updatedAt: string;
}

export const MOCK_STAFF_PROFILES: MockStaffUserProfile[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Carlos Rodriguez',
    email: 'admin@swift.local',
    role: 'admin',
    roleDisplay: 'Admin',
    status: 'Active',
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.admin },
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Mike Morales',
    email: 'cashier@swift.local',
    role: 'cashier',
    roleDisplay: 'Cashier',
    status: 'Active',
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.cashier },
    createdAt: '2026-10-02T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Dante Reyes',
    email: 'mechanic1@swift.local',
    role: 'mechanic',
    roleDisplay: 'Mechanic',
    status: 'Active',
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.mechanic },
    createdAt: '2026-10-03T08:00:00.000Z',
    updatedAt: '2026-10-03T08:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Rico Santos',
    email: 'warehouse@swift.local',
    role: 'inventory_clerk',
    roleDisplay: 'Inventory Clerk',
    status: 'Active',
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.inventory_clerk },
    createdAt: '2026-10-04T08:00:00.000Z',
    updatedAt: '2026-10-04T08:00:00.000Z',
  },
];
