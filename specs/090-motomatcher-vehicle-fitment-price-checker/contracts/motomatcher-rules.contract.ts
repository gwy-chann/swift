import { z } from 'zod';

export const AddFitmentRuleRequestSchema = z.object({
  productId: z.string().uuid(),
  modelId: z.string().uuid(),
  fitmentType: z.enum(['oem', 'aftermarket', 'universal']).optional().default('aftermarket'),
  yearRange: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type AddFitmentRuleRequest = z.infer<typeof AddFitmentRuleRequestSchema>;

export const AddFitmentRuleResponseSchema = z.object({
  success: z.boolean(),
  ruleId: z.string().optional(),
  error: z.string().optional(),
});

export type AddFitmentRuleResponse = z.infer<typeof AddFitmentRuleResponseSchema>;
