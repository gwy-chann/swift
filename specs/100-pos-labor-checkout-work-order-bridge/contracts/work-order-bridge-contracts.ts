import { z } from 'zod';

export const posCheckoutIntakeSchema = z.object({
  customerName: z.string().trim().min(1).default('Walk-in Customer'),
  vehicleModel: z.string().trim().min(1).default('Motorcycle (General)'),
  plateNumber: z.string().trim().min(1).default('FOR-REG'),
  notes: z.string().trim().optional(),
});

export type PosCheckoutIntakeInput = z.infer<typeof posCheckoutIntakeSchema>;

export const autoProvisionedWorkOrderSchema = z.object({
  id: z.string().uuid().optional(),
  orderNumber: z.string().min(1),
  bayId: z.string().uuid().nullable(),
  customerName: z.string().min(1),
  vehicleModel: z.string().min(1),
  plateNumber: z.string().min(1),
  serviceCode: z.string().min(1),
  serviceName: z.string().min(1),
  mechanicId: z.string().uuid().nullable().default(null),
  status: z.literal('QUEUED'),
  estimatedDurationMinutes: z.number().int().positive().default(30),
  notes: z.string().nullable().optional(),
  receiptNumber: z.string().optional(),
  createdAt: z.string(),
});

export type AutoProvisionedWorkOrder = z.infer<typeof autoProvisionedWorkOrderSchema>;

export const workOrderBroadcastEventSchema = z.object({
  event: z.literal('WORK_ORDER_CREATED'),
  channel: z.literal('operational-intelligence'),
  payload: autoProvisionedWorkOrderSchema,
});

export type WorkOrderBroadcastEvent = z.infer<typeof workOrderBroadcastEventSchema>;
