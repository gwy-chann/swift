import { z } from 'zod';

/**
 * Validation schema for individual day item in the 7-day revenue comparison chart
 */
export const dailyRevenueItemSchema = z.object({
  day: z.string().min(1),
  date: z.string().optional(),
  partsAmount: z.number().min(0).default(0),
  partsDisplay: z.string().default('₱0'),
  laborAmount: z.number().min(0).default(0),
  laborDisplay: z.string().default('₱0'),
  partsHeightPercent: z.number().min(0).max(100).default(0),
  laborHeightPercent: z.number().min(0).max(100).default(0),
  totalAmount: z.number().min(0).optional(),
});

export type DailyRevenueItemValidated = z.infer<typeof dailyRevenueItemSchema>;

/**
 * Validation schema for normalized weekly revenue dataset
 */
export const normalizedWeeklyRevenueSchema = z.object({
  days: z.array(dailyRevenueItemSchema).min(1).max(7),
  peakAmount: z.number().min(0).default(0),
  totalPartsWeekly: z.number().min(0).default(0),
  totalLaborWeekly: z.number().min(0).default(0),
  totalWeeklyRevenue: z.number().min(0).default(0),
  dateRangeLabel: z.string().default('Sept 22 - 28, 2026'),
});

export type NormalizedWeeklyRevenueValidated = z.infer<typeof normalizedWeeklyRevenueSchema>;

/**
 * Validation schema for RevenueComparisonChartProps
 */
export const revenueComparisonChartPropsSchema = z.object({
  data: z.union([
    z.array(dailyRevenueItemSchema),
    z.object({ days: z.array(dailyRevenueItemSchema) }),
  ]).optional(),
  dateRange: z.string().optional(),
  todayPartsIncrement: z.number().min(0).optional(),
  todayLaborIncrement: z.number().min(0).optional(),
  initialFilter: z.enum(['all', 'parts', 'labor']).optional(),
  className: z.string().optional(),
});

export type RevenueComparisonChartPropsValidated = z.infer<typeof revenueComparisonChartPropsSchema>;
