import { z } from 'zod';

export const WorkOrderStatusSchema = z.enum([
  'QUEUED',
  'IN PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
]);

export type WorkOrderStatus = z.infer<typeof WorkOrderStatusSchema>;

export const WorkOrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string().min(1),
  bayId: z.string().uuid().nullable().optional(),
  customerName: z.string().min(1),
  vehicleModel: z.string().min(1),
  plateNumber: z.string().min(1),
  serviceCode: z.string().min(1),
  serviceName: z.string().min(1),
  mechanicId: z.string().uuid().nullable().optional(),
  status: WorkOrderStatusSchema,
  estimatedDurationMinutes: z.number().int().positive().default(30),
  startedAt: z.union([z.date(), z.string()]).nullable().optional(),
  completedAt: z.union([z.date(), z.string()]).nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

export type WorkOrder = z.infer<typeof WorkOrderSchema>;

export const CreateWorkOrderPayloadSchema = z.object({
  orderNumber: z.string().min(1),
  bayId: z.string().uuid().nullable().optional(),
  customerName: z.string().min(1),
  vehicleModel: z.string().min(1),
  plateNumber: z.string().min(1),
  serviceCode: z.string().min(1),
  serviceName: z.string().min(1),
  mechanicId: z.string().uuid().nullable().optional(),
  status: WorkOrderStatusSchema.default('QUEUED'),
  estimatedDurationMinutes: z.number().int().positive().default(30),
  notes: z.string().optional(),
});

export type CreateWorkOrderPayload = z.infer<typeof CreateWorkOrderPayloadSchema>;
