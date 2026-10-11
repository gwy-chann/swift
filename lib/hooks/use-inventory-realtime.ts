'use client';

import { useEffect, useState, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '../supabase/client.ts';
import { inventoryStore } from '../store/inventory-store.ts';
import {
  mapRealtimeDbProductToProduct,
  didStockDropBelowThreshold
} from '../inventory/realtime-mapper.ts';
import type {
  RealtimeChannelStatus,
  UseInventoryRealtimeOptions,
  UseInventoryRealtimeResult
} from '../types/realtime.ts';

/**
 * Custom hook to subscribe to Supabase Realtime changes on public.products.
 * Automatically synchronizes incoming row payloads with inventoryStore
 * and triggers low-stock alert callbacks upon threshold breaches.
 *
 * @param options Configuration options and alert callbacks
 * @returns {UseInventoryRealtimeResult} Current connection status
 */
export function useInventoryRealtime(
  options?: UseInventoryRealtimeOptions
): UseInventoryRealtimeResult {
  const enabled = options?.enabled ?? true;
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeChannelStatus>(() =>
    enabled ? 'CONNECTING' : 'CLOSED'
  );

  // Keep callback references stable to prevent unnecessary re-subscribing
  const onUpdateRef = useRef(options?.onUpdate);
  const onLowStockRef = useRef(options?.onLowStock);

  useEffect(() => {
    onUpdateRef.current = options?.onUpdate;
    onLowStockRef.current = options?.onLowStock;
  }, [options?.onUpdate, options?.onLowStock]);

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

    const channelName = 'realtime:products-sync';
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
            if (payload.eventType === 'DELETE') {
              return;
            }

            if (payload.new && typeof payload.new.sku === 'string') {
              const previousStock =
                payload.old && typeof payload.old.stock === 'number'
                  ? payload.old.stock
                  : undefined;

              const mappedProduct = mapRealtimeDbProductToProduct(
                payload.new as { sku: string; [key: string]: unknown }
              );
              const updated = inventoryStore.updateProduct(mappedProduct);

              if (updated) {
                onUpdateRef.current?.(updated, payload as unknown as never);

                // Detect low-stock threshold breach
                if (
                  previousStock !== undefined &&
                  didStockDropBelowThreshold(previousStock, updated.stock, updated.minThreshold)
                ) {
                  onLowStockRef.current?.(updated);
                }
              }
            }
          } catch (err) {
            console.warn('[useInventoryRealtime] Error processing realtime change payload:', err);
          }
        }
      )
      .subscribe((channelStatus: string) => {
        switch (channelStatus) {
          case 'SUBSCRIBED':
            setStatus('SUBSCRIBED');
            setIsConnected(true);
            break;
          case 'TIMED_OUT':
            setStatus('TIMED_OUT');
            setIsConnected(false);
            break;
          case 'CHANNEL_ERROR':
            setStatus('CHANNEL_ERROR');
            setIsConnected(false);
            break;
          case 'CLOSED':
            setStatus('CLOSED');
            setIsConnected(false);
            break;
          default:
            break;
        }
      });

    return () => {
      supabase.removeChannel(channel).catch(() => {
        // Silently ignore channel removal errors during unmount
      });
    };
  }, [enabled]);

  return { isConnected, status };
}
