import { z } from 'zod';

export const UpdateMarkupRulesSchema = z.object({
  retailMarkup: z
    .number()
    .gt(0, 'Retail markup must be greater than 0%')
    .lte(200, 'Retail markup cannot exceed 200%'),
  wholesaleMarkup: z
    .number()
    .gt(0, 'Wholesale markup must be greater than 0%')
    .lte(200, 'Wholesale markup cannot exceed 200%'),
  aftermarketMarkup: z
    .number()
    .gt(0, 'Aftermarket markup must be greater than 0%')
    .lte(200, 'Aftermarket markup cannot exceed 200%'),
  hourlyLaborRate: z
    .number()
    .gte(0, 'Hourly labor rate must be non-negative')
    .optional(),
  userName: z.string().optional(),
  reason: z.string().optional()
});

export type UpdateMarkupRulesInput = z.infer<typeof UpdateMarkupRulesSchema>;
