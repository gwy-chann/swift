import { z } from 'zod';

export const AuditLogSeveritySchema = z.enum(['info', 'warning', 'security_alert']);

export const SecurityAuditLogSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  userId: z.string().uuid().nullable().optional(),
  userEmail: z.string().min(1),
  action: z.string().min(1),
  severity: AuditLogSeveritySchema,
  terminalIp: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
});

export const GetAuditLogsFilterSchema = z.object({
  severity: z.union([AuditLogSeveritySchema, z.literal('all')]).optional().default('all'),
  searchQuery: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export const LogSecurityEventInputSchema = z.object({
  action: z.string().trim().min(1, 'Action description cannot be empty'),
  severity: AuditLogSeveritySchema,
  terminalIp: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  userEmail: z.string().optional(),
});
