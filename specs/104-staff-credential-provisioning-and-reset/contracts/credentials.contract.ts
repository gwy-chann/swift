import { z } from 'zod';

export const PIN_VALIDATION_ERROR_MSG = 'PIN must consist of 4 to 6 numeric digits.';

export const StaffPinSchema = z
  .string()
  .trim()
  .regex(/^\d{4,6}$/, PIN_VALIDATION_ERROR_MSG);

export const StaffPasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters in length');

export const ApprovedStaffRoleSchema = z.enum(
  ['cashier', 'mechanic', 'inventory_clerk'] as const,
  {
    message:
      'Staff account role must be strictly one of: Cashier Privilege (cashier), Mechanic (mechanic), or Inventory Clerk (inventory_clerk).',
  }
);

export const ProvisionStaffCredentialsSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  role: ApprovedStaffRoleSchema,
  password: StaffPasswordSchema,
  pin: StaffPinSchema,
});

export const ResetStaffCredentialsSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  password: StaffPasswordSchema,
  pin: StaffPinSchema,
});

export type ProvisionStaffCredentialsInput = z.infer<typeof ProvisionStaffCredentialsSchema>;
export type ResetStaffCredentialsInput = z.infer<typeof ResetStaffCredentialsSchema>;

export interface ResetStaffCredentialsResult {
  success: boolean;
  message?: string;
  error?: string;
  code?: 'SUCCESS' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'USER_NOT_FOUND' | 'INTERNAL_ERROR';
  updatedAt?: string;
}
