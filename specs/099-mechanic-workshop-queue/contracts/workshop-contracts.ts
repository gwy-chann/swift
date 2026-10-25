import { z } from 'zod';

export const WORK_ORDER_STATUSES = [
  'QUEUED',
  'IN PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
] as const;

export const workOrderStatusSchema = z.enum(WORK_ORDER_STATUSES);

export const updateWorkOrderStatusSchema = z.object({
  status: workOrderStatusSchema,
  notes: z.string().max(1000).optional(),
});

export type UpdateWorkOrderStatusInput = z.infer<typeof updateWorkOrderStatusSchema>;

export const claimWorkOrderSchema = z.object({
  orderId: z.string().min(1),
  mechanicId: z.string().min(1),
  mechanicName: z.string().min(1),
  autoStart: z.boolean().default(false),
});

export type ClaimWorkOrderInput = z.infer<typeof claimWorkOrderSchema>;

export const workOrderLaborTaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean(),
  notes: z.string().optional(),
});

export type WorkOrderLaborTaskContract = z.infer<typeof workOrderLaborTaskSchema>;

export const workOrderRequiredPartSchema = z.object({
  sku: z.string(),
  partName: z.string(),
  quantityNeeded: z.number().int().positive(),
  stockAvailable: z.number().int().nonnegative(),
  shelfLocation: z.string(),
  isAvailable: z.boolean(),
});

export type WorkOrderRequiredPartContract = z.infer<typeof workOrderRequiredPartSchema>;

export const detailedWorkOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  bayId: z.string().nullable(),
  bayName: z.string().optional(),
  customerName: z.string(),
  customerPhone: z.string().optional(),
  vehicleModel: z.string(),
  plateNumber: z.string(),
  serviceCode: z.string(),
  serviceName: z.string(),
  mechanicId: z.string().nullable(),
  mechanicName: z.string().optional(),
  status: workOrderStatusSchema,
  estimatedDurationMinutes: z.number().int().positive(),
  remainingMinutes: z.number().int().optional(),
  startedAt: z.union([z.string(), z.date()]).nullable(),
  completedAt: z.union([z.string(), z.date()]).nullable(),
  notes: z.string().nullable(),
  laborTasks: z.array(workOrderLaborTaskSchema).optional(),
  requiredParts: z.array(workOrderRequiredPartSchema).optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export type DetailedWorkOrderContract = z.infer<typeof detailedWorkOrderSchema>;
