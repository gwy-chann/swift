import { z } from 'zod';

export const PricingRulesSchema = z.object({
  id: z.number().default(1),
  retailMarkup: z.number().positive().max(200),
  wholesaleMarkup: z.number().positive().max(200),
  aftermarketMarkup: z.number().positive().max(200),
  hourlyLaborRate: z.number().nonnegative(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().nullable().optional(),
});

export type PricingRules = z.infer<typeof PricingRulesSchema>;

export const UpdatePricingRulesPayloadSchema = z.object({
  retailMarkup: z.number().positive().max(200).optional(),
  wholesaleMarkup: z.number().positive().max(200).optional(),
  aftermarketMarkup: z.number().positive().max(200).optional(),
  hourlyLaborRate: z.number().nonnegative().optional(),
  userName: z.string().optional(),
  reason: z.string().optional(),
});

export type UpdatePricingRulesPayload = z.infer<typeof UpdatePricingRulesPayloadSchema>;
