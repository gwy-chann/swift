import { z } from 'zod';

export const LaborServiceSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  bay: z.string().min(1).max(100),
  rate: z.number().positive(),
  duration: z.string().min(1).max(50),
  description: z.string().optional().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LaborService = z.infer<typeof LaborServiceSchema>;

export const CreateLaborServiceSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Service code is required.')
    .regex(/^[A-Za-z0-9_-]+$/, 'Service code must contain only alphanumeric characters, dashes, or underscores.'),
  name: z.string().trim().min(1, 'Service title is required.'),
  bay: z.string().trim().min(1, 'Repair bay allocation is required.'),
  rate: z.number().positive('Flat labor rate must be greater than ₱0.00.'),
  duration: z.string().trim().min(1, 'Estimated duration is required.'),
  description: z.string().trim().optional(),
  active: z.boolean().optional().default(true),
});

export type CreateLaborServicePayload = z.infer<typeof CreateLaborServiceSchema>;

export const UpdateLaborServiceSchema = z.object({
  name: z.string().trim().min(1).optional(),
  bay: z.string().trim().min(1).optional(),
  rate: z.number().positive('Flat labor rate must be greater than ₱0.00.').optional(),
  duration: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().optional(),
  reason: z.string().trim().optional(),
  userName: z.string().trim().optional(),
});

export type UpdateLaborServicePayload = z.infer<typeof UpdateLaborServiceSchema>;

export const UpdateLaborServiceStatusSchema = z.object({
  active: z.boolean(),
});

export type UpdateLaborServiceStatusPayload = z.infer<typeof UpdateLaborServiceStatusSchema>;

export const ServiceRateAuditLogSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  serviceCode: z.string(),
  oldRate: z.number(),
  newRate: z.number(),
  reason: z.string(),
  userName: z.string(),
  createdAt: z.string(),
});

export type ServiceRateAuditLog = z.infer<typeof ServiceRateAuditLogSchema>;
