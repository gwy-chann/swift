/**
 * Realtime types and Supabase payload interfaces
 * Jira Ticket: SIAA-48 (STORY-2.9)
 */

import type { Product } from './product.ts';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface DbProductRow {
  id?: string;
  sku: string;
  name?: string;
  category?: string;
  brand?: string;
  model?: string;
  cost?: number | string;
  wholesale?: number | string;
  retail?: number | string;
  stock: number;
  min_threshold?: number;
  location?: string | null;
  oem?: boolean;
  image_url?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface RealtimePostgresChangesPayload<T = DbProductRow> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: RealtimeEventType;
  new: T;
  old: Partial<T>;
  errors?: string[];
}

export type RealtimeChannelStatus =
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CLOSED'
  | 'CHANNEL_ERROR'
  | 'CONNECTING';

export interface UseInventoryRealtimeOptions {
  enabled?: boolean;
  onUpdate?: (product: Product, payload: RealtimePostgresChangesPayload<DbProductRow>) => void;
  onLowStock?: (product: Product) => void;
}

export interface UseInventoryRealtimeResult {
  isConnected: boolean;
  status: RealtimeChannelStatus;
}

export * from '../contracts/executive-realtime.ts';
