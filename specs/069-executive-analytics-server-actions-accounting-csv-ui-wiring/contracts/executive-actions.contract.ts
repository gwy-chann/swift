import { z } from 'zod';

export const AnalyticsPeriodSchema = z.enum(['daily', 'weekly', 'monthly']);

export const GetCategoryPnlParamsSchema = z.object({
  period: AnalyticsPeriodSchema.default('daily'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const WorkOrderStatusSchema = z.enum([
  'QUEUED',
  'IN PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
]);

export const UpdateWorkOrderParamsSchema = z.object({
  orderId: z.string().uuid(),
  status: WorkOrderStatusSchema,
  notes: z.string().optional(),
});

export const ServiceBayDisplayItemSchema = z.object({
  id: z.string(),
  bayName: z.string(),
  status: z.enum(['AVAILABLE', 'IN PROGRESS', 'QUEUED', 'PENDING_PARTS', 'MAINTENANCE', 'COMPLETED']),
  vehicleService: z.string(),
  mechanicInfo: z.string(),
});

export const AccountingCsvExportResultSchema = z.object({
  success: z.boolean(),
  filename: z.string(),
  csvContent: z.string(),
  rowCount: z.number().int().nonnegative(),
  period: AnalyticsPeriodSchema,
  generatedAt: z.string(),
  error: z.string().optional(),
});
