import { z } from "zod";

export const StaffPermissionsSchema = z.object({
  can_discount: z.boolean(),
  can_override_discount: z.boolean(),
  can_void_transaction: z.boolean(),
  can_adjust_stock: z.boolean(),
  can_access_admin: z.boolean(),
  can_view_reports: z.boolean(),
});

export const StaffProfileSchema = z.object({
  id: z.string().uuid().or(z.string()),
  full_name: z.string(),
  email: z.string().email(),
  role: z.string(),
  permissions: StaffPermissionsSchema,
  is_active: z.boolean().optional(),
});

export const KioskAuthRequestSchema = z.object({
  profileId: z.string().min(1, "Profile ID is required"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 numeric digits"),
});

export const KioskAuthSuccessResponseSchema = z.object({
  success: z.literal(true),
  profile: StaffProfileSchema,
});

export const KioskAuthFailureResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.enum(["INVALID_PIN", "PROFILE_NOT_FOUND", "ACCOUNT_INACTIVE", "UNKNOWN_ERROR"]),
});

export const KioskAuthResponseSchema = z.discriminatedUnion("success", [
  KioskAuthSuccessResponseSchema,
  KioskAuthFailureResponseSchema,
]);

export type KioskAuthRequest = z.infer<typeof KioskAuthRequestSchema>;
export type KioskAuthResponse = z.infer<typeof KioskAuthResponseSchema>;
export type StaffPermissions = z.infer<typeof StaffPermissionsSchema>;
