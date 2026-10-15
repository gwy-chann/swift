import { z } from 'zod';

export const ServiceBayStatusSchema = z.enum([
  'AVAILABLE',
  'OCCUPIED',
  'MAINTENANCE',
  'QUEUED',
]);

export type ServiceBayStatus = z.infer<typeof ServiceBayStatusSchema>;

export const ServiceBaySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  bayType: z.string().min(1),
  status: ServiceBayStatusSchema,
  displayOrder: z.number().int().nonnegative(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

export type ServiceBay = z.infer<typeof ServiceBaySchema>;

export const CreateServiceBayPayloadSchema = z.object({
  name: z.string().min(1),
  bayType: z.string().min(1),
  status: ServiceBayStatusSchema.default('AVAILABLE'),
  displayOrder: z.number().int().nonnegative().default(0),
});

export type CreateServiceBayPayload = z.infer<typeof CreateServiceBayPayloadSchema>;
