'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '../supabase/client.ts';
import { inventoryStore } from '../store/inventory-store.ts';
import {
  mapRealtimeDbProductToProduct,
  didStockDropBelowThreshold
} from '../inventory/realtime-mapper.ts';
import type {
  UseMotoMatcherRealtimeOptions,
  UseMotoMatcherRealtimeResult
} from '../types/motomatcher.ts';
import type {
  RealtimeChannelStatus,
  DbProductRow
} from '../types/realtime.ts';
import type { Product } from '../types/product.ts';

interface ProductChangeCallbacks {
  onStockUpdate?: (product: Product) => void;
  onLowStock?: (product: Product) => void;
  onOutOfStock?: (product: Product) => void;
  onSuccess: () => void;
}

function processProductChange(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  callbacks: ProductChangeCallbacks
): void {
  if (payload.eventType === 'DELETE' || !payload.new || typeof payload.new.sku !== 'string') {
    return;
  }

  const oldRecord = payload.old as Record<string, unknown> | undefined;
  const previousStock =
    oldRecord && typeof oldRecord.stock === 'number'
      ? (oldRecord.stock as number)
      : undefined;

  const mappedProduct = mapRealtimeDbProductToProduct(payload.new as DbProductRow);
  const updated = inventoryStore.updateProduct(mappedProduct);
  if (!updated) {
    return;
  }

  callbacks.onSuccess();
  callbacks.onStockUpdate?.(updated);

  if (updated.stock <= 0) {
    callbacks.onOutOfStock?.(updated);
  }

  if (
    previousStock !== undefined &&
    didStockDropBelowThreshold(previousStock, updated.stock, updated.minThreshold)
  ) {
    callbacks.onLowStock?.(updated);
  }
}

function processFitmentChange(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  activeModelId: string | null | undefined,
  onFitmentChange?: () => void,
  onSuccess?: () => void
): void {
  const rawNew = payload.new as { model_id?: string } | undefined;
  const rawOld = payload.old as { model_id?: string } | undefined;

  const isRelevant =
    !activeModelId ||
    rawNew?.model_id === activeModelId ||
    rawOld?.model_id === activeModelId;

  if (isRelevant) {
    onSuccess?.();
    onFitmentChange?.();
  }
}

/**
 * Custom React hook subscribing to Supabase Realtime changes for MotoMatcher.
 * Listens on channel 'motomatcher-matrix' for inventory updates on `public.products`
 * and fitment changes on `public.product_fitments`.
 *
 * Automatically updates `inventoryStore`, manages connection health, triggers
 * low-stock/out-of-stock callbacks, and supports silent reconnection with
 * optimistic cache invalidation.
 *
 * @param activeModelId Optional active motorcycle model UUID currently selected
 * @param options Optional configuration and callback hooks
 * @returns {UseMotoMatcherRealtimeResult} Connection status, last sync timestamp, and cache invalidator
 */
export function useMotoMatcherRealtime(
  activeModelId?: string | null,
  options?: UseMotoMatcherRealtimeOptions
): UseMotoMatcherRealtimeResult {
  const enabled = options?.enabled ?? true;
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeChannelStatus>(() =>
    enabled ? 'CONNECTING' : 'CLOSED'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const onStockUpdateRef = useRef(options?.onStockUpdate);
  const onLowStockRef = useRef(options?.onLowStock);
  const onOutOfStockRef = useRef(options?.onOutOfStock);
  const onFitmentChangeRef = useRef(options?.onFitmentChange);
  const hasEverConnectedRef = useRef(false);

  useEffect(() => {
    onStockUpdateRef.current = options?.onStockUpdate;
    onLowStockRef.current = options?.onLowStock;
    onOutOfStockRef.current = options?.onOutOfStock;
    onFitmentChangeRef.current = options?.onFitmentChange;
  }, [
    options?.onStockUpdate,
    options?.onLowStock,
    options?.onOutOfStock,
    options?.onFitmentChange
  ]);

  const invalidateCache = useCallback(() => {
    setLastSyncedAt(new Date());
    onFitmentChangeRef.current?.();
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return;
    }

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channelName = 'motomatcher-matrix';
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        } as const,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          try {
            processProductChange(payload, {
              onStockUpdate: onStockUpdateRef.current,
              onLowStock: onLowStockRef.current,
              onOutOfStock: onOutOfStockRef.current,
              onSuccess: () => setLastSyncedAt(new Date())
            });
          } catch (err) {
            console.warn('[useMotoMatcherRealtime] Error processing product change:', err);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_fitments'
        } as const,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          try {
            processFitmentChange(
              payload,
              activeModelId,
              onFitmentChangeRef.current,
              () => setLastSyncedAt(new Date())
            );
          } catch (err) {
            console.warn('[useMotoMatcherRealtime] Error processing fitment change:', err);
          }
        }
      )
      .subscribe((channelStatus: string) => {
        switch (channelStatus) {
          case 'SUBSCRIBED': {
            if (hasEverConnectedRef.current) {
              invalidateCache();
            }
            hasEverConnectedRef.current = true;
            setStatus('SUBSCRIBED');
            setIsConnected(true);
            setLastSyncedAt(new Date());
            break;
          }
          case 'TIMED_OUT': {
            setStatus('TIMED_OUT');
            setIsConnected(false);
            break;
          }
          case 'CHANNEL_ERROR': {
            setStatus('CHANNEL_ERROR');
            setIsConnected(false);
            break;
          }
          case 'CLOSED': {
            setStatus('CLOSED');
            setIsConnected(false);
            break;
          }
          default:
            break;
        }
      });

    return () => {
      supabase.removeChannel(channel).catch(() => {
        // Silently ignore channel removal errors during unmount
      });
    };
  }, [enabled, activeModelId, invalidateCache]);

  return {
    isConnected,
    status,
    lastSyncedAt,
    invalidateCache
  };
}
