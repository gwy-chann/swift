'use client';

import { useEffect, useState, useRef, useId } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '../supabase/client.ts';
import type {
  UseExecutiveRealtimeOptions,
  UseExecutiveRealtimeResult,
  RealtimeChannelStatus,
  RealtimeEventType,
  DbTransactionBroadcast,
  DbWorkOrderBroadcast,
  DbServiceBayBroadcast,
  DbProductStockBroadcast,
} from '../contracts/executive-realtime.ts';

function parseTransactionRecord(newRec: Record<string, unknown>): DbTransactionBroadcast {
  const totalDue = Number(newRec.total_due) || 0;
  return {
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
}

function parseStockAlertRecord(newProd: Record<string, unknown>): DbProductStockBroadcast | null {
  const stock = Number(newProd.stock) || 0;
  const minThreshold = Number(newProd.min_threshold) || 5;
  if (stock > minThreshold) {
    return null;
  }
  return {
    id: typeof newProd.id === 'string' ? newProd.id : undefined,
    sku: typeof newProd.sku === 'string' ? newProd.sku : 'SKU-ALERT',
    name: typeof newProd.name === 'string' ? newProd.name : 'Product',
    stock,
    min_threshold: minThreshold,
    updated_at: typeof newProd.updated_at === 'string' ? newProd.updated_at : new Date().toISOString(),
  };
}

function mapChannelStatus(rawStatus: string): { status: RealtimeChannelStatus; isConnected: boolean } {
  if (rawStatus === 'SUBSCRIBED') {
    return { status: 'SUBSCRIBED', isConnected: true };
  }
  if (rawStatus === 'TIMED_OUT') {
    return { status: 'TIMED_OUT', isConnected: false };
  }
  if (rawStatus === 'CHANNEL_ERROR') {
    return { status: 'CHANNEL_ERROR', isConnected: false };
  }
  if (rawStatus === 'CLOSED') {
    return { status: 'CLOSED', isConnected: false };
  }
  return { status: 'CONNECTING', isConnected: false };
}

interface ExecutiveSubscriber {
  onTransaction?: (tx: DbTransactionBroadcast) => void;
  onWorkOrderChange?: (record: DbWorkOrderBroadcast, eventType: RealtimeEventType) => void;
  onServiceBayChange?: (record: DbServiceBayBroadcast, eventType: RealtimeEventType) => void;
  onStockAlert?: (record: DbProductStockBroadcast) => void;
  onStatusChange?: (status: RealtimeChannelStatus) => void;
  updateStatus: (status: RealtimeChannelStatus, isConnected: boolean) => void;
  updateTimestamp: (timestamp: string) => void;
}

/**
 * Shared singleton hub that multiplexes a single Supabase Realtime channel across
 * multiple hook consumers. Prevents `cannot add postgres_changes callbacks after subscribe()`
 * errors when multiple components or React StrictMode mount simultaneously.
 */
class ExecutiveRealtimeHub {
  private subscribers = new Map<string, ExecutiveSubscriber>();
  private channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
  private supabase: ReturnType<typeof createClient> | null = null;
  private currentStatus: RealtimeChannelStatus = 'CONNECTING';
  private isConnected = false;
  private lastCommitTimestamp: string | null = null;

  register(id: string, callbacks: ExecutiveSubscriber, channelName: string) {
    this.subscribers.set(id, callbacks);

    // If channel is already established, share existing state immediately
    if (this.channel) {
      callbacks.updateStatus(this.currentStatus, this.isConnected);
      if (this.lastCommitTimestamp) {
        callbacks.updateTimestamp(this.lastCommitTimestamp);
      }
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      this.currentStatus = 'CLOSED';
      this.isConnected = false;
      callbacks.updateStatus('CLOSED', false);
      return;
    }

    try {
      this.supabase = createClient();

      // Clean up any stale or unmounted channel with this name
      const existing = this.supabase.getChannels().find(
        (c) => c.topic === `realtime:${channelName}`
      );
      if (existing) {
        this.supabase.removeChannel(existing).catch(() => {});
      }

      const ch = this.supabase.channel(channelName);
      this.channel = ch;

      ch.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (!payload.new) return;
          const txData = parseTransactionRecord(payload.new as Record<string, unknown>);
          const ts = payload.commit_timestamp || new Date().toISOString();
          this.lastCommitTimestamp = ts;
          this.subscribers.forEach((s) => {
            s.updateTimestamp(ts);
            s.onTransaction?.(txData);
          });
        }
      );

      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_orders' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const hasNew = payload.new && Object.keys(payload.new).length > 0;
          const record = (hasNew ? payload.new : payload.old) as unknown as DbWorkOrderBroadcast;
          if (record?.id) {
            const ts = payload.commit_timestamp || new Date().toISOString();
            this.lastCommitTimestamp = ts;
            const evType = (payload.eventType || 'UPDATE') as RealtimeEventType;
            this.subscribers.forEach((s) => {
              s.updateTimestamp(ts);
              s.onWorkOrderChange?.(record, evType);
            });
          }
        }
      );

      ch.on(
        'broadcast',
        { event: 'WORK_ORDER_CREATED' },
        (eventPayload: { payload: unknown }) => {
          if (eventPayload?.payload) {
            const record = eventPayload.payload as unknown as DbWorkOrderBroadcast;
            if (record?.id) {
              const ts = new Date().toISOString();
              this.lastCommitTimestamp = ts;
              this.subscribers.forEach((s) => {
                s.updateTimestamp(ts);
                s.onWorkOrderChange?.(record, 'INSERT');
              });
            }
          }
        }
      );

      ch.on(
        'broadcast',
        { event: 'WORK_ORDER_UPDATED' },
        (eventPayload: { payload: unknown }) => {
          if (eventPayload?.payload) {
            const record = eventPayload.payload as unknown as DbWorkOrderBroadcast;
            if (record?.id) {
              const ts = new Date().toISOString();
              this.lastCommitTimestamp = ts;
              this.subscribers.forEach((s) => {
                s.updateTimestamp(ts);
                s.onWorkOrderChange?.(record, 'UPDATE');
              });
            }
          }
        }
      );

      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_bays' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const hasNew = payload.new && Object.keys(payload.new).length > 0;
          const record = (hasNew ? payload.new : payload.old) as unknown as DbServiceBayBroadcast;
          if (record?.id) {
            const ts = payload.commit_timestamp || new Date().toISOString();
            this.lastCommitTimestamp = ts;
            const evType = (payload.eventType || 'UPDATE') as RealtimeEventType;
            this.subscribers.forEach((s) => {
              s.updateTimestamp(ts);
              s.onServiceBayChange?.(record, evType);
            });
          }
        }
      );

      ch.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (!payload.new) return;
          const alert = parseStockAlertRecord(payload.new as Record<string, unknown>);
          if (alert) {
            const ts = payload.commit_timestamp || new Date().toISOString();
            this.lastCommitTimestamp = ts;
            this.subscribers.forEach((s) => {
              s.updateTimestamp(ts);
              s.onStockAlert?.(alert);
            });
          }
        }
      );

      ch.subscribe((rawStatus: string) => {
        const mapped = mapChannelStatus(rawStatus);
        this.currentStatus = mapped.status;
        this.isConnected = mapped.isConnected;
        this.subscribers.forEach((s) => {
          s.updateStatus(mapped.status, mapped.isConnected);
        });
      });
    } catch (err) {
      console.warn('[useExecutiveRealtime] Supabase Realtime channel setup failed:', err);
      this.currentStatus = 'CHANNEL_ERROR';
      this.isConnected = false;
      this.subscribers.forEach((s) => {
        s.updateStatus('CHANNEL_ERROR', false);
      });
    }
  }

  updateCallbacks(id: string, callbacks: Partial<ExecutiveSubscriber>) {
    const existing = this.subscribers.get(id);
    if (existing) {
      this.subscribers.set(id, { ...existing, ...callbacks });
    }
  }

  unregister(id: string) {
    this.subscribers.delete(id);
    if (this.subscribers.size === 0 && this.channel && this.supabase) {
      const ch = this.channel;
      this.channel = null;
      this.currentStatus = 'CLOSED';
      this.isConnected = false;
      this.supabase.removeChannel(ch).catch(() => {});
    }
  }

  dispatchLocalCheckout(txData: DbTransactionBroadcast) {
    const ts = txData.created_at || new Date().toISOString();
    this.lastCommitTimestamp = ts;
    this.subscribers.forEach((s) => {
      s.updateTimestamp(ts);
      s.onTransaction?.(txData);
    });
  }
}

const globalHub = new ExecutiveRealtimeHub();

/**
 * Custom hook subscribing to Supabase Realtime Change Data Capture (CDC) events
 * on channel `operational-intelligence` (Jira Ticket SIAA-68 / STORY-6.8).
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

  const subscriberId = useId();

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

    globalHub.updateCallbacks(subscriberId, {
      onTransaction: options?.onTransaction,
      onWorkOrderChange: options?.onWorkOrderChange,
      onServiceBayChange: options?.onServiceBayChange,
      onStockAlert: options?.onStockAlert,
      onStatusChange: options?.onStatusChange,
    });
  }, [
    subscriberId,
    options?.onTransaction,
    options?.onWorkOrderChange,
    options?.onServiceBayChange,
    options?.onStockAlert,
    options?.onStatusChange,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    globalHub.register(
      subscriberId,
      {
        onTransaction: (tx) => onTransactionRef.current?.(tx),
        onWorkOrderChange: (wo, ev) => onWorkOrderChangeRef.current?.(wo, ev),
        onServiceBayChange: (bay, ev) => onServiceBayChangeRef.current?.(bay, ev),
        onStockAlert: (alert) => onStockAlertRef.current?.(alert),
        onStatusChange: (newStatus) => onStatusChangeRef.current?.(newStatus),
        updateStatus: (newStatus, connected) => {
          setStatus(newStatus);
          setIsConnected(connected);
          onStatusChangeRef.current?.(newStatus);
        },
        updateTimestamp: (ts) => setLastEventTimestamp(ts),
      },
      channelName
    );

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
        globalHub.dispatchLocalCheckout(txData);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('swift:pos:checkout', handleLocalCheckout);
    }

    return () => {
      globalHub.unregister(subscriberId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('swift:pos:checkout', handleLocalCheckout);
      }
    };
  }, [enabled, channelName, subscriberId]);

  return {
    isConnected,
    status,
    lastEventTimestamp,
  };
}
