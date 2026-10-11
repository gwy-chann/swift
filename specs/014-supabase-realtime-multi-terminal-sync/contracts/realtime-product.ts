/**
 * Contract: Supabase Realtime Product Synchronization
 * Feature: SIAA-48 (STORY-2.9)
 */

import type { Product } from '@/lib/types/product';

export interface DbProductPayload {
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
}

export interface UseInventoryRealtimeOptions {
  enabled?: boolean;
  onUpdate?: (product: Product) => void;
  onLowStock?: (product: Product) => void;
}

export interface UseInventoryRealtimeResult {
  isConnected: boolean;
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | 'CONNECTING';
}
