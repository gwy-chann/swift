import { z } from "zod";

export const WorkOrderStatusSchema = z.enum([
  "QUEUED",
  "IN PROGRESS",
  "PENDING_PARTS",
  "COMPLETED",
  "CANCELLED",
]);

export type WorkOrderStatus = z.infer<typeof WorkOrderStatusSchema>;

export const ServiceBayDisplayItemSchema = z.object({
  id: z.string().uuid(),
  bayName: z.string().min(1),
  status: WorkOrderStatusSchema,
  vehicleService: z.string().min(1),
  mechanicInfo: z.string().min(1),
  mechanicName: z.string().optional(),
  estimatedMinutesLeft: z.number().int().nonnegative().optional(),
});

export type ServiceBayDisplayItem = z.infer<typeof ServiceBayDisplayItemSchema>;

export const ServiceBayStatusCardPropsSchema = z.object({
  bays: z.array(ServiceBayDisplayItemSchema).optional(),
});

export type ServiceBayStatusCardProps = z.infer<typeof ServiceBayStatusCardPropsSchema>;
