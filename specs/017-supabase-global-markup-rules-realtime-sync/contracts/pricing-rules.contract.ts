import { z } from 'zod';

export const PricingRulesUpdateSchema = z.object({
  retailMarkup: z
    .number({ invalid_type_error: 'Retail markup must be a valid number' })
    .min(0.01, { message: 'Retail markup must be greater than 0%' })
    .max(200, { message: 'Retail markup cannot exceed 200%' })
    .optional(),
  wholesaleMarkup: z
    .number({ invalid_type_error: 'Wholesale markup must be a valid number' })
    .min(0.01, { message: 'Wholesale markup must be greater than 0%' })
    .max(200, { message: 'Wholesale markup cannot exceed 200%' })
    .optional(),
  aftermarketMarkup: z
    .number({ invalid_type_error: 'Aftermarket markup must be a valid number' })
    .min(0.01, { message: 'Aftermarket markup must be greater than 0%' })
    .max(200, { message: 'Aftermarket markup cannot exceed 200%' })
    .optional(),
  hourlyLaborRate: z
    .number({ invalid_type_error: 'Hourly labor rate must be a valid number' })
    .min(0, { message: 'Hourly labor rate must be greater than or equal to 0' })
    .optional(),
  userName: z.string().optional(),
  reason: z.string().optional()
});

export type PricingRulesUpdatePayload = z.infer<typeof PricingRulesUpdateSchema>;
