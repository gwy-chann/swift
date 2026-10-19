/**
 * SIAA-78: Staff Kiosk Authentication & Database Persistence Contracts
 */

import { z } from 'zod';

export const StaffPinSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 numeric digits');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const VerifyStaffPinSchema = z.object({
  profileId: z.string().regex(uuidRegex, 'Invalid employee profile ID'),
  pin: StaffPinSchema,
});

export type VerifyStaffPinInput = z.infer<typeof VerifyStaffPinSchema>;

export const StaffKioskProfileSchema = z.object({
  id: z.string().regex(uuidRegex, 'Invalid employee profile ID'),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'cashier', 'mechanic', 'inventory_clerk', 'staff']),
  roleDisplay: z.string(),
  avatarInitials: z.string(),
  pin: z.string().optional(),
});

export type StaffKioskProfile = z.infer<typeof StaffKioskProfileSchema>;

export const VerifyStaffPinResultSchema = z.object({
  success: z.boolean(),
  profile: StaffKioskProfileSchema.optional(),
  code: z
    .enum(['INVALID_PIN', 'PROFILE_NOT_FOUND', 'DATABASE_ERROR', 'UNAUTHORIZED'])
    .optional(),
  error: z.string().optional(),
});

export type VerifyStaffPinResult = z.infer<typeof VerifyStaffPinResultSchema>;

export const ClockInPayloadSchema = z.object({
  profileId: z.string().regex(uuidRegex, 'Invalid employee profile ID'),
  terminalId: z.string().optional(),
  notes: z.string().optional(),
});

export type ClockInPayload = z.infer<typeof ClockInPayloadSchema>;

export const DEFAULT_DEMO_PINS: Record<string, string> = {
  '00000000-0000-0000-0000-000000000002': '1234', // Mike Morales (Cashier)
  '00000000-0000-0000-0000-000000000003': '2222', // Dante Reyes (Mechanic)
  '00000000-0000-0000-0000-000000000004': '3333', // Rico Santos (Inventory Clerk)
  '00000000-0000-0000-0000-000000000001': '8888', // Carlos Rodriguez (Admin)
};
