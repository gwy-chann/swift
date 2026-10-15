import { z } from 'zod';

/**
 * Validation schema for Executive KPI Card Props
 */
export const adminKpiGridPropsSchema = z.object({
  grossRevenue: z.number().min(0).optional(),
  grossRevenueYesterday: z.number().min(0).optional(),
  revenueGrowthPct: z.number().optional(),
  livePulse: z.boolean().optional(),
  salesIncrement: z.number().nullable().optional(),
  activeWorkOrders: z.number().int().min(0).optional(),
  pendingPartsWorkOrders: z.number().int().min(0).optional(),
  netProfitMarginPct: z.number().optional(),
  grossProfitAmount: z.number().optional(),
  lowStockCount: z.number().int().min(0).optional(),
  isLowStockDanger: z.boolean().optional(),
  lowStockHref: z.string().optional(),
});

export type AdminKpiGridPropsValidated = z.infer<typeof adminKpiGridPropsSchema>;

/**
 * Validation schema for formatted KPI card display model
 */
export const kpiCardDisplayItemSchema = z.object({
  title: z.string(),
  badge: z.string(),
  badgeVariant: z.enum(['default', 'live', 'danger']),
  value: z.string(),
  valueColor: z.string().optional(),
  subtext: z.string(),
  subtextColor: z.string(),
  href: z.string().optional(),
  isClickable: z.boolean().default(false),
});

export type KpiCardDisplayItem = z.infer<typeof kpiCardDisplayItemSchema>;
