import { z } from 'zod';

export const MotorcycleModelDtoSchema = z.object({
  id: z.string().uuid(),
  make: z.string().min(1),
  model: z.string().min(1),
  displacement_cc: z.number().int().positive(),
  year_start: z.number().int(),
  year_end: z.number().int().nullable().optional(),
  category: z.string().min(1),
  image_url: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type MotorcycleModelDto = z.infer<typeof MotorcycleModelDtoSchema>;

export const MotorcycleModelsResponseSchema = z.array(MotorcycleModelDtoSchema);
export type MotorcycleModelsResponse = z.infer<typeof MotorcycleModelsResponseSchema>;
