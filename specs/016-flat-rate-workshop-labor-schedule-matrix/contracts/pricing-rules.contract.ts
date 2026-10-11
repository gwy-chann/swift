import { z } from "zod";

export const PricingRulesSchema = z.object({
  retailMarkup: z.number().min(0, "Retail markup must be non-negative"),
  wholesaleMarkup: z.number().min(0, "Wholesale markup must be non-negative"),
  aftermarketMarkup: z.number().min(0, "Aftermarket markup must be non-negative"),
  hourlyLaborRate: z.number().min(1, "Hourly labor rate must be greater than zero")
});

export type PricingRulesContract = z.infer<typeof PricingRulesSchema>;

export const UpdateHourlyRateSchema = z.object({
  hourlyLaborRate: z.number().min(1, "Hourly labor rate must be at least ₱1.00"),
  userName: z.string().optional()
});

export type UpdateHourlyRatePayload = z.infer<typeof UpdateHourlyRateSchema>;

export const ProRatedEstimateInputSchema = z.object({
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute"),
  hourlyLaborRate: z.number().min(1, "Hourly labor rate must be at least ₱1.00")
});

export type ProRatedEstimateInput = z.infer<typeof ProRatedEstimateInputSchema>;
