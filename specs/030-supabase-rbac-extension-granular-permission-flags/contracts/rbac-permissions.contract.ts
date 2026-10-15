import { z } from 'zod';
import type { DbUserRole, UserRole } from '@/lib/types/auth';

/**
 * Zod validation schemas and TypeScript contracts for Supabase RBAC Extension,
 * Granular Permission Flags Schema & Admin Provisioning Actions.
 * Source: SIAA-56 (STORY-7.6)
 */

export const DbUserRoleSchema = z.enum([
  'admin',
  'staff',
  'cashier',
  'mechanic',
  'inventory_clerk',
]);

export const UserRoleDisplaySchema = z.enum([
  'Admin',
  'Cashier',
  'Mechanic',
  'Staff',
  'Inventory Clerk',
]);

export const StaffPermissionsSchema = z.object({
  can_adjust_stock: z.boolean().default(false),
  can_override_discount: z.boolean().default(false),
  can_manage_pricing: z.boolean().default(false),
  can_view_reports: z.boolean().default(false),
});

export const ProvisionStaffUserSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  role: DbUserRoleSchema,
  permissions: StaffPermissionsSchema.partial().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const UpdateUserPermissionsSchema = z.object({
  userId: z.string().uuid('Invalid user UUID'),
  permissions: StaffPermissionsSchema.partial(),
});

export const ToggleUserStatusSchema = z.object({
  userId: z.string().uuid('Invalid user UUID'),
  status: z.enum(['Active', 'Inactive', 'Suspended']),
});

export type DbUserRoleType = z.infer<typeof DbUserRoleSchema>;
export type StaffPermissionsType = z.infer<typeof StaffPermissionsSchema>;
export type ProvisionStaffUserPayload = z.infer<typeof ProvisionStaffUserSchema>;
export type UpdateUserPermissionsPayload = z.infer<typeof UpdateUserPermissionsSchema>;
export type ToggleUserStatusPayload = z.infer<typeof ToggleUserStatusSchema>;

export interface StaffUserSummary {
  id: string;
  email: string;
  fullName: string;
  role: DbUserRole;
  roleDisplay: UserRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  permissions: StaffPermissionsType;
  createdAt: string;
  updatedAt: string;
}

export interface UserActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?:
    | 'UNAUTHORIZED'
    | 'SELF_LOCKOUT_PREVENTED'
    | 'DUPLICATE_EMAIL'
    | 'USER_NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'DATABASE_ERROR';
}
