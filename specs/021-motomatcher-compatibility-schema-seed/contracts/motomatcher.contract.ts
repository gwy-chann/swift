import { z } from "zod";

/**
 * Zod validation schema for MotorcycleModel
 */
export const MotorcycleModelSchema = z.object({
  id: z.string().uuid(),
  make: z.string().min(1),
  model: z.string().min(1),
  displacement_cc: z.number().int().positive(),
  year_start: z.number().int().min(1900),
  year_end: z.number().int().min(1900).nullable(),
  category: z.string().min(1),
  image_url: z.string().url().nullable().optional(),
  created_at: z.string().datetime().or(z.date()).optional(),
  updated_at: z.string().datetime().or(z.date()).optional(),
});

export type MotorcycleModelRecord = z.infer<typeof MotorcycleModelSchema>;

/**
 * Zod validation schema for ProductFitment
 */
export const FitmentTypeSchema = z.enum(["oem", "aftermarket", "universal"]);
export type FitmentType = z.infer<typeof FitmentTypeSchema>;

export const ProductFitmentSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  model_id: z.string().uuid(),
  fitment_type: FitmentTypeSchema,
  year_range: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().datetime().or(z.date()).optional(),
});

export type ProductFitmentRecord = z.infer<typeof ProductFitmentSchema>;

/**
 * Composite view with joined motorcycle model and product details
 */
export const FitmentWithDetailsSchema = ProductFitmentSchema.extend({
  product_sku: z.string().optional(),
  product_name: z.string().optional(),
  model_name: z.string().optional(),
  model_make: z.string().optional(),
});

export type FitmentWithDetails = z.infer<typeof FitmentWithDetailsSchema>;
