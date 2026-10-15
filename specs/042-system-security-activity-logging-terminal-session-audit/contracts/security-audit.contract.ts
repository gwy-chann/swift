import { z } from 'zod';

/**
 * Severity levels for forensic security audit entries
 */
export const AuditLogSeveritySchema = z.enum(['info', 'warning', 'security_alert']);
export type AuditLogSeverity = z.infer<typeof AuditLogSeveritySchema>;

/**
 * Validation schema for domain entity SecurityAuditLog
 */
export const SecurityAuditLogSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  userId: z.string().uuid().nullable().optional(),
  userEmail: z.string().min(1, 'User email/identity cannot be empty'),
  action: z.string().min(1, 'Action description cannot be empty'),
  severity: AuditLogSeveritySchema,
  terminalIp: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
});
export type SecurityAuditLog = z.infer<typeof SecurityAuditLogSchema>;

/**
 * Input validation schema for logging a security event
 */
export const LogSecurityEventInputSchema = z.object({
  action: z.string().trim().min(1, 'Action description cannot be empty'),
  severity: AuditLogSeveritySchema,
  terminalIp: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  userEmail: z.string().optional(),
});
export type LogSecurityEventInput = z.infer<typeof LogSecurityEventInputSchema>;

/**
 * Filter and query validation schema for audit logs
 */
export const GetAuditLogsFilterSchema = z.object({
  severity: z.union([AuditLogSeveritySchema, z.literal('all')]).optional().default('all'),
  searchQuery: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});
export type GetAuditLogsFilter = z.infer<typeof GetAuditLogsFilterSchema>;

/**
 * Export options schema supporting both CSV and JSON formats
 */
export const ExportAuditLogsOptionsSchema = GetAuditLogsFilterSchema.extend({
  format: z.enum(['csv', 'json']).optional().default('csv'),
});
export type ExportAuditLogsOptions = z.infer<typeof ExportAuditLogsOptionsSchema>;

/**
 * Validation helper for log event input
 */
export function validateLogSecurityEventInput(input: unknown) {
  return LogSecurityEventInputSchema.safeParse(input);
}

/**
 * Validation helper for export options
 */
export function validateExportAuditLogsOptions(input: unknown) {
  return ExportAuditLogsOptionsSchema.safeParse(input);
}
