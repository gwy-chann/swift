import { z } from 'zod';
import type { DbUserRole, UserRole, StaffPermissions } from '@/lib/types/auth';

export const StaffPermissionsSchema = z.object({
  can_adjust_stock: z.boolean().default(false),
  can_override_discount: z.boolean().default(false),
  can_manage_pricing: z.boolean().default(false),
  can_view_reports: z.boolean().default(false),
});

export const DbUserRoleSchema = z.enum([
  'admin',
  'cashier',
  'mechanic',
  'inventory_clerk',
  'staff',
]);

export const ProvisionStaffUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must contain at least 2 characters').max(100),
  email: z.string().email('Invalid email address format'),
  role: DbUserRoleSchema,
  password: z.string().min(6, 'Password or temporary PIN must be at least 6 characters').optional(),
  permissions: StaffPermissionsSchema.partial().optional(),
});

export type ProvisionStaffUserPayload = z.infer<typeof ProvisionStaffUserSchema>;

export const UpdateStaffUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  fullName: z.string().min(2, 'Full name must contain at least 2 characters').max(100).optional(),
  role: DbUserRoleSchema.optional(),
  permissions: StaffPermissionsSchema.partial().optional(),
});

export type UpdateStaffUserPayload = z.infer<typeof UpdateStaffUserSchema>;

export const ToggleUserStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  status: z.enum(['Active', 'Inactive']),
});

export type ToggleUserStatusPayload = z.infer<typeof ToggleUserStatusSchema>;

export interface StaffUserSummary {
  id: string;
  email: string;
  fullName: string;
  role: DbUserRole;
  roleDisplay: UserRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  permissions: StaffPermissions;
  createdAt: string;
  updatedAt: string;
}

export type UserActionResult<T> =
  | { success: true; data: T; error?: never; code?: never }
  | { success: false; data?: never; error: string; code?: string };
