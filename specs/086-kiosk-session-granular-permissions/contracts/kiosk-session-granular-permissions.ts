import { z } from 'zod';

export const StaffPermissionsSchema = z.object({
  can_adjust_stock: z.boolean().default(false),
  can_override_discount: z.boolean().default(false),
  can_manage_pricing: z.boolean().default(false),
  can_view_reports: z.boolean().default(false),
});

export type StaffPermissionsContract = z.infer<typeof StaffPermissionsSchema>;

export const StaffKioskProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'cashier', 'mechanic', 'inventory_clerk', 'staff']),
  roleDisplay: z.string(),
  avatarInitials: z.string(),
  pin: z.string().optional(),
  permissions: StaffPermissionsSchema,
});

export type StaffKioskProfileContract = z.infer<typeof StaffKioskProfileSchema>;

export const FetchStaffShiftResultSchema = z.object({
  success: z.boolean(),
  shift: z.any().nullable().optional(),
  permissions: StaffPermissionsSchema,
  profile: StaffKioskProfileSchema.optional(),
  error: z.string().optional(),
});

export type FetchStaffShiftResultContract = z.infer<typeof FetchStaffShiftResultSchema>;
