import { z } from 'zod';

export const LaborServiceCodeSchema = z
  .string()
  .trim()
  .min(3, 'Service code must be at least 3 characters')
  .max(30, 'Service code cannot exceed 30 characters')
  .regex(/^[A-Z0-9_-]+$/i, 'Service code must contain only alphanumeric characters, dashes, or underscores');

export const RepairBaySchema = z
  .string()
  .trim()
  .min(2, 'Repair bay name must be at least 2 characters');

export const LaborRateSchema = z
  .number()
  .positive('Labor rate must be greater than ₱0.00')
  .max(100000, 'Labor rate exceeds maximum allowed value')
  .refine((val) => Number(val.toFixed(2)) === val, {
    message: 'Labor rate cannot have more than 2 decimal places'
  });

export const ServiceDurationSchema = z
  .string()
  .trim()
  .min(2, 'Duration is required (e.g. 15 mins, 45 mins)')
  .max(50, 'Duration description is too long');

export const CreateLaborServiceSchema = z.object({
  code: LaborServiceCodeSchema,
  name: z.string().trim().min(3, 'Service title must be at least 3 characters').max(100),
  bay: RepairBaySchema,
  rate: LaborRateSchema,
  duration: ServiceDurationSchema,
  description: z.string().trim().max(500).optional(),
  active: z.boolean().default(true)
});

export const UpdateLaborServiceSchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  bay: RepairBaySchema.optional(),
  rate: LaborRateSchema.optional(),
  duration: ServiceDurationSchema.optional(),
  description: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
  reason: z.string().trim().max(255).optional(),
  userName: z.string().trim().max(100).optional()
});

export type CreateLaborServiceInput = z.infer<typeof CreateLaborServiceSchema>;
export type UpdateLaborServiceInput = z.infer<typeof UpdateLaborServiceSchema>;
