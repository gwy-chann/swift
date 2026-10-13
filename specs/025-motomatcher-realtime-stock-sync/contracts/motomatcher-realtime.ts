import { z } from 'zod';

/**
 * Zod schema for Supabase Realtime product payload row
 */
export const RealtimeProductRowSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1),
  name: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  cost: z.union([z.number(), z.string()]).optional(),
  wholesale: z.union([z.number(), z.string()]).optional(),
  retail: z.union([z.number(), z.string()]).optional(),
  stock: z.number().int(),
  min_threshold: z.number().int().optional().default(0),
  location: z.string().nullable().optional(),
  oem: z.boolean().optional().default(false),
  image_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  updated_at: z.string().optional(),
});

export type RealtimeProductRow = z.infer<typeof RealtimeProductRowSchema>;

/**
 * Zod schema for Supabase Realtime product_fitment payload row
 */
export const RealtimeFitmentRowSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  model_id: z.string().uuid(),
  fitment_type: z.enum(['oem', 'aftermarket', 'universal']),
  year_range: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type RealtimeFitmentRow = z.infer<typeof RealtimeFitmentRowSchema>;

/**
 * Realtime channel connection statuses
 */
export const RealtimeStatusEnum = z.enum([
  'CONNECTING',
  'SUBSCRIBED',
  'TIMED_OUT',
  'CHANNEL_ERROR',
  'CLOSED',
]);

export type RealtimeStatus = z.infer<typeof RealtimeStatusEnum>;
