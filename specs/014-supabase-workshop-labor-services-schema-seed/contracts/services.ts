import { z } from 'zod';

export const LaborServiceSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'Service code is required'),
  name: z.string().min(1, 'Service name is required'),
  bay: z.string().min(1, 'Bay designation is required'),
  rate: z.number().nonnegative('Labor rate must be non-negative'),
  duration: z.string().min(1, 'Duration is required'),
  description: z.string().optional(),
  active: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type LaborServiceContract = z.infer<typeof LaborServiceSchema>;

export const GetLaborServicesResponseSchema = z.array(LaborServiceSchema);
