import { z } from 'zod';

export const PricingRulesUpdateSchema = z.object({
  retailMarkup: z
    .number()
    .min(0.01, 'Retail markup must be greater than 0%')
    .max(200, 'Retail markup cannot exceed 200%')
    .optional(),
  wholesaleMarkup: z
    .number()
    .min(0.01, 'Wholesale markup must be greater than 0%')
    .max(200, 'Wholesale markup cannot exceed 200%')
    .optional(),
  aftermarketMarkup: z
    .number()
    .min(0.01, 'Aftermarket markup must be greater than 0%')
    .max(200, 'Aftermarket markup cannot exceed 200%')
    .optional(),
  hourlyLaborRate: z
    .number()
    .min(0, 'Hourly labor rate must be greater than or equal to 0')
    .optional(),
  userName: z.string().optional(),
  reason: z.string().optional()
});

export type PricingRulesUpdatePayload = z.infer<typeof PricingRulesUpdateSchema>;
