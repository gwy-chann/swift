import { z } from 'zod';

/**
 * Validation schema for baseline staff seed record
 */
export const BaselineStaffAccountSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['admin', 'cashier', 'mechanic', 'inventory_clerk']),
  status: z.enum(['Active', 'Inactive', 'Suspended']),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  targetUrl: z.string().startsWith('/'),
  buttonLabel: z.string().min(2),
});

export type BaselineStaffAccount = z.infer<typeof BaselineStaffAccountSchema>;

/**
 * Validation schema for the complete seed manifest
 */
export const SeedManifestSchema = z.object({
  admin: BaselineStaffAccountSchema,
  staffAccounts: z.array(BaselineStaffAccountSchema).length(3),
});

export type SeedManifest = z.infer<typeof SeedManifestSchema>;

/**
 * Contract for two-step authentication request
 */
export const TwoStepLoginStep1Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  selectedRole: z.enum(['admin', 'staff']),
  rememberTerminal: z.boolean().default(false),
});

export const TwoStepLoginStep2Schema = z.object({
  profileId: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

export const TwoStepLoginResponseSchema = z.object({
  success: z.boolean(),
  redirectTo: z.string().optional(),
  error: z.string().optional(),
  code: z.string().optional(),
});
