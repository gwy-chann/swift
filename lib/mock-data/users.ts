import { UserSession } from '@/lib/types/auth';

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
