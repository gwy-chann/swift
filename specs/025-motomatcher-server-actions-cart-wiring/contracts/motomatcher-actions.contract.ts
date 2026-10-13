import { z } from 'zod';
import { MotoMatcherMatrixPayloadSchema } from '@/lib/types/motomatcher';

export const FitmentMatrixActionResultSchema = z.object({
  success: z.boolean(),
  data: MotoMatcherMatrixPayloadSchema,
  error: z.string().optional(),
});

export type FitmentMatrixActionResult = z.infer<typeof FitmentMatrixActionResultSchema>;

export const AddFitmentRuleInputSchema = z.object({
  productId: z.string().min(1, 'Product ID or SKU is required'),
  modelId: z.string().min(1, 'Motorcycle Model ID is required'),
  fitmentType: z.enum(['oem', 'aftermarket', 'universal']).optional().default('aftermarket'),
  yearRange: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type AddFitmentRuleInput = z.infer<typeof AddFitmentRuleInputSchema>;

export const AddFitmentRuleResultSchema = z.object({
  success: z.boolean(),
  ruleId: z.string().optional(),
  error: z.string().optional(),
});

export type AddFitmentRuleResult = z.infer<typeof AddFitmentRuleResultSchema>;
