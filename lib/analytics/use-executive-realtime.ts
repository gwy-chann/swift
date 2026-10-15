'use client';

import { useEffect, useState, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '../supabase/client.ts';
import type {
  UseExecutiveRealtimeOptions,
  UseExecutiveRealtimeResult,
  RealtimeChannelStatus,
  DbTransactionBroadcast,
  DbWorkOrderBroadcast,
  DbServiceBayBroadcast,
  DbProductStockBroadcast,
} from '../contracts/executive-realtime.ts';

/**
 * Custom hook subscribing to Supabase Realtime Change Data Capture (CDC) events
 * on channel `operational-intelligence` (Jira Ticket SIAA-68 / STORY-6.8).
 * Multiplexes transactions, work orders, service bays, and critical low-stock alerts.
 */
export function useExecutiveRealtime(
  options?: UseExecutiveRealtimeOptions
): UseExecutiveRealtimeResult {
  const enabled = options?.enabled ?? true;
  const channelName = options?.channelName ?? 'operational-intelligence';

  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeChannelStatus>(() =>
    enabled ? 'CONNECTING' : 'CLOSED'
  );
  const [lastEventTimestamp, setLastEventTimestamp] = useState<string | null>(null);

  const onTransactionRef = useRef(options?.onTransaction);
  const onWorkOrderChangeRef = useRef(options?.onWorkOrderChange);
  const onServiceBayChangeRef = useRef(options?.onServiceBayChange);
  const onStockAlertRef = useRef(options?.onStockAlert);
  const onStatusChangeRef = useRef(options?.onStatusChange);

  useEffect(() => {
    onTransactionRef.current = options?.onTransaction;
    onWorkOrderChangeRef.current = options?.onWorkOrderChange;
    onServiceBayChangeRef.current = options?.onServiceBayChange;
    onStockAlertRef.current = options?.onStockAlert;
    onStatusChangeRef.current = options?.onStatusChange;
  }, [
    options?.onTransaction,
    options?.onWorkOrderChange,
    options?.onServiceBayChange,
    options?.onStockAlert,
    options?.onStatusChange,
  ]);

  useEffect(() => {
    if (!enabled) {
      setStatus('CLOSED');
      setIsConnected(false);
      return;
    }

    const updateStatus = (newStatus: RealtimeChannelStatus, connected: boolean) => {
      setStatus(newStatus);
      setIsConnected(connected);
      onStatusChangeRef.current?.(newStatus);
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;

    if (supabaseUrl && supabaseAnonKey) {
      try {
        supabase = createClient();
        channel = supabase.channel(channelName);

        // 1. Transactions subscription (INSERT)
        channel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'transactions' },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            try {
              const newRec = payload.new as Record<string, unknown>;
              if (newRec) {
                const totalDue = Number(newRec.total_due) || 0;
                const txData: DbTransactionBroadcast = {
                  id: typeof newRec.id === 'string' ? newRec.id : undefined,
                  receipt_number: typeof newRec.receipt_number === 'string' ? newRec.receipt_number : 'TX-LIVE',
                  cashier_name: typeof newRec.cashier_name === 'string' ? newRec.cashier_name : 'Cashier',
                  pricing_mode: typeof newRec.pricing_mode === 'string' ? newRec.pricing_mode : 'retail',
                  total_due: totalDue,
                  subtotal: Number(newRec.subtotal) || totalDue,
                  discount_amount: Number(newRec.discount_amount) || 0,
                  payment_method: typeof newRec.payment_method === 'string' ? newRec.payment_method : 'Cash',
                  created_at: typeof newRec.created_at === 'string' ? newRec.created_at : new Date().toISOString(),
                };
                setLastEventTimestamp(payload.commit_timestamp || new Date().toISOString());
                onTransactionRef.current?.(txData);
              }
            } catch (err) {
              console.warn('[useExecutiveRealtime] Error processing transaction event:', err);
            }
          }
        );

        // 2. Work Orders subscription (INSERT, UPDATE, DELETE)
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'work_orders' },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            try {
              const record = (payload.new && Object.keys(payload.new).length > 0
                ? payload.new
                : payload.old) as unknown as DbWorkOrderBroadcast;
              if (record && record.id) {
                setLastEventTimestamp(payload.commit_timestamp || new Date().toISOString());
                onWorkOrderChangeRef.current?.(record, payload.eventType);
              }
            } catch (err) {
              console.warn('[useExecutiveRealtime] Error processing work order event:', err);
            }
          }
        );

        // 3. Service Bays subscription (INSERT, UPDATE)
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'service_bays' },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            try {
              const record = (payload.new && Object.keys(payload.new).length > 0
                ? payload.new
                : payload.old) as unknown as DbServiceBayBroadcast;
              if (record && record.id) {
                setLastEventTimestamp(payload.commit_timestamp || new Date().toISOString());
                onServiceBayChangeRef.current?.(record, payload.eventType);
              }
            } catch (err) {
              console.warn('[useExecutiveRealtime] Error processing service bay event:', err);
            }
          }
        );

        // 4. Products Low Stock subscription (UPDATE)
        channel.on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'products' },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            try {
              const newProd = payload.new as Record<string, unknown>;
              if (newProd) {
                const stock = Number(newProd.stock) || 0;
                const minThreshold = Number(newProd.min_threshold) || 5;
                if (stock <= minThreshold) {
                  const stockAlert: DbProductStockBroadcast = {
                    id: typeof newProd.id === 'string' ? newProd.id : undefined,
                    sku: typeof newProd.sku === 'string' ? newProd.sku : 'SKU-ALERT',
                    name: typeof newProd.name === 'string' ? newProd.name : 'Product',
                    stock,
                    min_threshold: minThreshold,
                    updated_at: typeof newProd.updated_at === 'string' ? newProd.updated_at : new Date().toISOString(),
                  };
                  setLastEventTimestamp(payload.commit_timestamp || new Date().toISOString());
                  onStockAlertRef.current?.(stockAlert);
                }
              }
            } catch (err) {
              console.warn('[useExecutiveRealtime] Error processing product stock event:', err);
            }
          }
        );

        // Subscribe to channel
        channel.subscribe((channelStatus: string) => {
          switch (channelStatus) {
            case 'SUBSCRIBED':
              updateStatus('SUBSCRIBED', true);
              break;
            case 'TIMED_OUT':
              updateStatus('TIMED_OUT', false);
              break;
            case 'CHANNEL_ERROR':
              updateStatus('CHANNEL_ERROR', false);
              break;
            case 'CLOSED':
              updateStatus('CLOSED', false);
              break;
            default:
              break;
          }
        });
      } catch (err) {
        console.warn('[useExecutiveRealtime] Supabase Realtime channel setup failed:', err);
        updateStatus('CHANNEL_ERROR', false);
      }
    } else {
      updateStatus('CLOSED', false);
    }

    // Local custom event listener for testing / offline checkout broadcast
    const handleLocalCheckout = (e: Event) => {
      const customEvent = e as CustomEvent<{ totalDue?: number; receiptNumber?: string }>;
      if (customEvent.detail && typeof customEvent.detail.totalDue === 'number') {
        const amount = customEvent.detail.totalDue;
        const txData: DbTransactionBroadcast = {
          receipt_number: customEvent.detail.receiptNumber || 'TX-LOCAL',
          cashier_name: 'Staff Cashier',
          total_due: amount,
          payment_method: 'Cash',
          created_at: new Date().toISOString(),
        };
        setLastEventTimestamp(new Date().toISOString());
        onTransactionRef.current?.(txData);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('swift:pos:checkout', handleLocalCheckout);
    }

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('swift:pos:checkout', handleLocalCheckout);
      }
    };
  }, [enabled, channelName]);

  return {
    isConnected,
    status,
    lastEventTimestamp,
  };
}
