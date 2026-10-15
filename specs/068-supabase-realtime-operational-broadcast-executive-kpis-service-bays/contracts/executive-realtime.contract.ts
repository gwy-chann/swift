import { z } from 'zod';

export const RealtimeEventTypeSchema = z.enum(['INSERT', 'UPDATE', 'DELETE', '*']);

export const DbTransactionBroadcastSchema = z.object({
  id: z.string().optional(),
  receipt_number: z.string(),
  cashier_name: z.string().default('Cashier'),
  pricing_mode: z.string().default('retail'),
  total_due: z.union([z.number(), z.string()]).transform(val => Number(val) || 0),
  subtotal: z.union([z.number(), z.string()]).transform(val => Number(val) || 0).optional(),
  discount_amount: z.union([z.number(), z.string()]).transform(val => Number(val) || 0).optional(),
  payment_method: z.string().default('Cash'),
  created_at: z.string().optional(),
});

export const DbWorkOrderBroadcastSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  bay_id: z.string().nullable().optional(),
  customer_name: z.string().default('Customer'),
  vehicle_model: z.string().default('Vehicle'),
  plate_number: z.string().default(''),
  service_name: z.string(),
  service_code: z.string().default('SRV'),
  mechanic_id: z.string().nullable().optional(),
  status: z.enum(['QUEUED', 'IN PROGRESS', 'PENDING_PARTS', 'COMPLETED', 'CANCELLED']),
  estimated_duration_minutes: z.number().default(30),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const DbServiceBayBroadcastSchema = z.object({
  id: z.string(),
  name: z.string(),
  bay_type: z.string(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'QUEUED']),
  display_order: z.number().default(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const DbProductStockBroadcastSchema = z.object({
  id: z.string().optional(),
  sku: z.string(),
  name: z.string().default(''),
  stock: z.number(),
  min_threshold: z.number().default(5),
  updated_at: z.string().optional(),
});

export type DbTransactionBroadcast = z.infer<typeof DbTransactionBroadcastSchema>;
export type DbWorkOrderBroadcast = z.infer<typeof DbWorkOrderBroadcastSchema>;
export type DbServiceBayBroadcast = z.infer<typeof DbServiceBayBroadcastSchema>;
export type DbProductStockBroadcast = z.infer<typeof DbProductStockBroadcastSchema>;
