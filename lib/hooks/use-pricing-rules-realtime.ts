'use client';

import { useEffect, useState, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '../supabase/client.ts';
import type { PricingRules } from '../types/pricing.ts';

export type RealtimeChannelStatus =
  | 'CONNECTING'
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CLOSED'
  | 'CHANNEL_ERROR';

export interface UsePricingRulesRealtimeOptions {
  enabled?: boolean;
  onUpdate?: (updatedRules: PricingRules) => void;
}

export interface UsePricingRulesRealtimeResult {
  isConnected: boolean;
  status: RealtimeChannelStatus;
}

export function mapDbPricingRowToPricingRules(row: Record<string, unknown>): PricingRules {
  return {
    id: typeof row.id === 'number' ? row.id : 1,
    retailMarkup: Number(row.retail_markup ?? 35),
    wholesaleMarkup: Number(row.wholesale_markup ?? 18),
    aftermarketMarkup: Number(row.aftermarket_markup ?? 40),
    hourlyLaborRate: Number(row.hourly_labor_rate ?? 450),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
    updatedBy: typeof row.updated_by === 'string' ? row.updated_by : null
  };
}

/**
 * Custom hook to subscribe to Supabase Realtime changes on public.pricing_rules.
 * Listens on channel `public:pricing_rules` (matching Jira SIAA-57 specification)
 * and dispatches callbacks for UPDATE CDC events in <500ms.
 */
export function usePricingRulesRealtime(
  options?: UsePricingRulesRealtimeOptions
): UsePricingRulesRealtimeResult {
  const enabled = options?.enabled ?? true;
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeChannelStatus>(() =>
    enabled ? 'CONNECTING' : 'CLOSED'
  );

  const onUpdateRef = useRef(options?.onUpdate);

  useEffect(() => {
    onUpdateRef.current = options?.onUpdate;
  }, [options?.onUpdate]);

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

    // Jira SIAA-57 specification: supabase.channel('public:pricing_rules')
    const channelName = 'public:pricing_rules';
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pricing_rules'
        } as const,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          try {
            if (payload.new && typeof payload.new === 'object') {
              const mappedRules = mapDbPricingRowToPricingRules(payload.new as Record<string, unknown>);
              onUpdateRef.current?.(mappedRules);
            }
          } catch (err) {
            console.warn(
              '[usePricingRulesRealtime] Error processing realtime change payload:',
              err
            );
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
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [enabled]);

  return { isConnected, status };
}
