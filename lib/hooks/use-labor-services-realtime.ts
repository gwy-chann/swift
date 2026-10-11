'use client';

import { useEffect, useState, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '../supabase/client.ts';
import { mapRealtimeDbServiceToLaborService } from '../pos/labor-realtime-mapper.ts';
import type { LaborService } from '../types/service.ts';
import type {
  RealtimeChannelStatus,
  UseLaborServicesRealtimeOptions,
  UseLaborServicesRealtimeResult
} from '../../specs/015-workshop-labor-services-crud-realtime/contracts/realtime-service.contract.ts';

/**
 * Custom hook to subscribe to Supabase Realtime changes on public.labor_services.
 * Listens on channel `public:labor_services` (matching Jira SIAA-59 specification)
 * and dispatches callbacks for INSERT, UPDATE, and DELETE CDC events in <500ms.
 *
 * @param options Configuration options and change callbacks
 * @returns {UseLaborServicesRealtimeResult} Current connection status
 */
export function useLaborServicesRealtime(
  options?: UseLaborServicesRealtimeOptions
): UseLaborServicesRealtimeResult {
  const enabled = options?.enabled ?? true;
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeChannelStatus>(() =>
    enabled ? 'CONNECTING' : 'CLOSED'
  );

  const onInsertRef = useRef(options?.onInsert);
  const onUpdateRef = useRef(options?.onUpdate);
  const onDeleteRef = useRef(options?.onDelete);

  useEffect(() => {
    onInsertRef.current = options?.onInsert;
    onUpdateRef.current = options?.onUpdate;
    onDeleteRef.current = options?.onDelete;
  }, [options?.onInsert, options?.onUpdate, options?.onDelete]);

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

    // Specification: listens on supabase.channel('public:labor_services')
    const channelName = 'public:labor_services';
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labor_services'
        } as const,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          try {
            if (payload.eventType === 'DELETE') {
              const old = payload.old as Record<string, unknown> | undefined;
              const id = typeof old?.id === 'string' ? old.id : '';
              const code = typeof old?.code === 'string' ? old.code : '';
              onDeleteRef.current?.(id, code);
              return;
            }

            if (payload.new && typeof payload.new.code === 'string') {
              const mappedService: LaborService = mapRealtimeDbServiceToLaborService(
                payload.new as Record<string, unknown>
              );

              if (payload.eventType === 'INSERT') {
                onInsertRef.current?.(mappedService);
              } else if (payload.eventType === 'UPDATE') {
                onUpdateRef.current?.(mappedService);
              }
            }
          } catch (err) {
            console.warn(
              '[useLaborServicesRealtime] Error processing realtime change payload:',
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
