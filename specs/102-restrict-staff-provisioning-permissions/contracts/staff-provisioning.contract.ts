import { z } from 'zod';
import type { StaffPermissions } from '@/lib/types/auth';

/**
 * Zod validation schemas and TypeScript contracts for SIAA-102:
 * Restrict staff provisioning permissions strictly to Cashier, Mechanic, and Inventory Clerk.
 */

export const ApprovedStaffRoleSchema = z.enum(
  ['cashier', 'mechanic', 'inventory_clerk'],
  {
    message: 'Staff account role must be one of: Cashier Privilege (cashier), Mechanic (mechanic), or Inventory Clerk (inventory_clerk).',
  }
);

export type ApprovedStaffRole = z.infer<typeof ApprovedStaffRoleSchema>;

export const APPROVED_ROLE_OPTIONS = [
  { label: 'Cashier Privilege', value: 'cashier' },
  { label: 'Mechanic', value: 'mechanic' },
  { label: 'Inventory Clerk', value: 'inventory_clerk' },
] as const;

export const RestrictedProvisionStaffUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address format'),
  role: ApprovedStaffRoleSchema,
  permissions: z.record(z.string(), z.boolean()).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export type RestrictedProvisionStaffUserPayload = z.infer<typeof RestrictedProvisionStaffUserSchema>;

export const DEFAULT_PROVISION_ROLE_PERMISSIONS: Record<ApprovedStaffRole, StaffPermissions> = {
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
  inventory_clerk: {
    can_adjust_stock: true,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
};
