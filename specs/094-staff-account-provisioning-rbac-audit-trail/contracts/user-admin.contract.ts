import { z } from 'zod';

export const DbUserRoleSchema = z.enum([
  'admin',
  'staff',
  'cashier',
  'mechanic',
  'inventory_clerk',
]);

export type DbUserRole = z.infer<typeof DbUserRoleSchema>;

export const UserRoleDisplaySchema = z.enum([
  'Admin',
  'Staff',
  'Cashier',
  'Mechanic',
  'Inventory Clerk',
]);

export type UserRoleDisplay = z.infer<typeof UserRoleDisplaySchema>;

export const StaffPermissionsSchema = z.object({
  can_adjust_stock: z.boolean().default(false),
  can_override_discount: z.boolean().default(false),
  can_manage_pricing: z.boolean().default(false),
  can_view_reports: z.boolean().default(false),
});

export type StaffPermissions = z.infer<typeof StaffPermissionsSchema>;

export const UserStatusSchema = z.enum(['Active', 'Inactive', 'Suspended']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const StaffUserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1),
  role: DbUserRoleSchema,
  roleDisplay: UserRoleDisplaySchema,
  status: UserStatusSchema,
  permissions: StaffPermissionsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type StaffUserResponse = z.infer<typeof StaffUserResponseSchema>;

export const ProvisionStaffUserRequestSchema = z.object({
  email: z.string().trim().email('Invalid email address format.'),
  fullName: z.string().trim().min(1, 'Full name is required.'),
  role: DbUserRoleSchema,
  password: z.string().min(6).optional(),
  permissions: StaffPermissionsSchema.partial().optional(),
});

export type ProvisionStaffUserRequest = z.infer<typeof ProvisionStaffUserRequestSchema>;

export const UpdateStaffUserRequestSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  role: DbUserRoleSchema.optional(),
  permissions: StaffPermissionsSchema.partial().optional(),
});

export type UpdateStaffUserRequest = z.infer<typeof UpdateStaffUserRequestSchema>;

export const UpdateUserPermissionsRequestSchema = z.object({
  permissions: StaffPermissionsSchema.partial(),
});

export type UpdateUserPermissionsRequest = z.infer<typeof UpdateUserPermissionsRequestSchema>;

export const UpdateUserStatusRequestSchema = z.object({
  status: UserStatusSchema,
});

export type UpdateUserStatusRequest = z.infer<typeof UpdateUserStatusRequestSchema>;

export const AuditSeveritySchema = z.enum(['info', 'warning', 'security_alert']);
export type AuditSeverity = z.infer<typeof AuditSeveritySchema>;

export const SecurityAuditLogResponseSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  userId: z.string().uuid().nullable().optional(),
  userEmail: z.string().email(),
  action: z.string().min(1),
  severity: AuditSeveritySchema,
  terminalIp: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  createdAt: z.string(),
});

export type SecurityAuditLogResponse = z.infer<typeof SecurityAuditLogResponseSchema>;

export const LogSecurityEventRequestSchema = z.object({
  action: z.string().trim().min(1, 'Action description is required.'),
  severity: AuditSeveritySchema.default('info'),
  terminalIp: z.string().trim().optional().nullable(),
  metadata: z.record(z.any()).default({}),
  userEmail: z.string().email().optional(),
});

export type LogSecurityEventRequest = z.infer<typeof LogSecurityEventRequestSchema>;
