import { z } from 'zod';

/**
 * Standard error message mandated by Jira SIAA-103 acceptance criteria
 */
export const INACTIVE_ACCOUNT_ERROR_MESSAGE =
  'Account is inactive. Please contact your workshop administrator.';

export const INACTIVE_ACCOUNT_CODE = 'ACCOUNT_INACTIVE';

/**
 * Schema validating status of staff profile
 */
export const staffStatusSchema = z.enum(['Active', 'Inactive', 'Suspended']);
export type StaffStatus = z.infer<typeof staffStatusSchema>;

/**
 * Schema for login rejection payload
 */
export const authRejectionPayloadSchema = z.object({
  success: z.literal(false),
  code: z.literal(INACTIVE_ACCOUNT_CODE),
  error: z.literal(INACTIVE_ACCOUNT_ERROR_MESSAGE),
});
export type AuthRejectionPayload = z.infer<typeof authRejectionPayloadSchema>;

/**
 * Schema validating PIN verification rejection
 */
export const pinRejectionPayloadSchema = z.object({
  success: z.literal(false),
  code: z.literal(INACTIVE_ACCOUNT_CODE),
  error: z.literal(INACTIVE_ACCOUNT_ERROR_MESSAGE),
});
export type PinRejectionPayload = z.infer<typeof pinRejectionPayloadSchema>;

/**
 * Schema for session revocation event payload
 */
export const sessionRevocationEventSchema = z.object({
  userId: z.string().uuid(),
  revokedAt: z.string().datetime(),
  reason: z.literal('ACCOUNT_DEACTIVATED'),
  actionBy: z.string().uuid().or(z.literal('ADMIN_CONSOLE')),
});
export type SessionRevocationEvent = z.infer<typeof sessionRevocationEventSchema>;

/**
 * URL Query parameter schema for login screen redirect notice
 */
export const loginNoticeParamsSchema = z.object({
  notice: z.enum(['inactive', 'session_expired', 'unauthorized']).optional(),
  error: z.string().optional(),
});
export type LoginNoticeParams = z.infer<typeof loginNoticeParamsSchema>;
