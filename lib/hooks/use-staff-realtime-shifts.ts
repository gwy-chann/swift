'use client';

import { useEffect, useState, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '../supabase/client.ts';
import { punchStore, usePunchStore } from '../store/punch-store.ts';
import type { DbStaffShift } from '../types/logs.ts';
import type {
  RealtimeChannelStatus,
  UseStaffRealtimeShiftsOptions,
  UseStaffRealtimeShiftsResult,
} from '../contracts/realtime-attendance.ts';

/**
 * Custom hook to subscribe to Supabase Realtime Change Data Capture (CDC) events
 * on public.staff_shifts. Listens on channel `staff_shifts_changes` (Jira SIAA-63)
 * and updates punchStore in sub-500ms without page reloads.
 */
export function useStaffRealtimeShifts(
  options?: UseStaffRealtimeShiftsOptions
): UseStaffRealtimeShiftsResult {
  const enabled = options?.enabled ?? true;
  const channelName = options?.channelName ?? 'staff_shifts_changes';

  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeChannelStatus>(() =>
    enabled ? 'CONNECTING' : 'CLOSED'
  );

  const { activeStaffCount } = usePunchStore();

  const onInsertRef = useRef(options?.onInsert);
  const onUpdateRef = useRef(options?.onUpdate);
  const onDeleteRef = useRef(options?.onDelete);
  const onStatusChangeRef = useRef(options?.onStatusChange);

  useEffect(() => {
    onInsertRef.current = options?.onInsert;
    onUpdateRef.current = options?.onUpdate;
    onDeleteRef.current = options?.onDelete;
    onStatusChangeRef.current = options?.onStatusChange;
  }, [options?.onInsert, options?.onUpdate, options?.onDelete, options?.onStatusChange]);

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

    const updateStatus = (newStatus: RealtimeChannelStatus, connected: boolean) => {
      setStatus(newStatus);
      setIsConnected(connected);
      onStatusChangeRef.current?.(newStatus);
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_shifts',
        } as const,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          try {
            if (payload.eventType === 'DELETE') {
              const old = payload.old as Record<string, unknown> | undefined;
              const id = typeof old?.id === 'string' ? old.id : '';
              if (id) {
                onDeleteRef.current?.(id);
              }
              return;
            }

            if (payload.new && typeof payload.new.id === 'string') {
              const shiftRow = payload.new as unknown as DbStaffShift;

              if (payload.eventType === 'INSERT') {
                punchStore.handleRealtimeShiftInsert(shiftRow);
                onInsertRef.current?.(shiftRow);
              } else if (payload.eventType === 'UPDATE') {
                punchStore.handleRealtimeShiftUpdate(shiftRow);
                onUpdateRef.current?.(shiftRow);
              }
            }
          } catch (err) {
            console.warn('[useStaffRealtimeShifts] Error processing realtime shift event:', err);
          }
        }
      )
      .subscribe((channelStatus: string) => {
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

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [enabled, channelName]);

  return {
    isConnected,
    status,
    activeStaffCount,
  };
}
