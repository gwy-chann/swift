'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Wrench,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { PesoIcon } from '@/components/icons/peso-icon';
import { createClient } from '@/lib/supabase/client';

export function AdminKpiGrid() {
  const [grossRevenue, setGrossRevenue] = useState(45230.0);
  const [livePulse, setLivePulse] = useState(false);
  const [salesIncrement, setSalesIncrement] = useState<number | null>(null);

  useEffect(() => {
    // 1. Supabase Realtime channel subscription on public.transactions
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        supabase = createClient();
        channel = supabase
          .channel('pos_transactions_channel')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'transactions' },
            (payload) => {
              const newRecord = payload.new as { total_due?: number | string };
              if (newRecord && newRecord.total_due !== undefined) {
                const amount = Number(newRecord.total_due) || 0;
                setGrossRevenue((prev) => prev + amount);
                setSalesIncrement(amount);
                setLivePulse(true);
                setTimeout(() => setLivePulse(false), 4000);
              }
            }
          )
          .subscribe();
      }
    } catch (err) {
      console.warn('[AdminKpiGrid] Supabase Realtime subscription could not be established:', err);
    }

    // 2. Local window event listener for testing / offline checkout broadcast
    const handleLocalCheckout = (e: Event) => {
      const customEvent = e as CustomEvent<{ totalDue?: number }>;
      if (customEvent.detail && typeof customEvent.detail.totalDue === 'number') {
        const amount = customEvent.detail.totalDue;
        setGrossRevenue((prev) => prev + amount);
        setSalesIncrement(amount);
        setLivePulse(true);
        setTimeout(() => setLivePulse(false), 4000);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('swift:pos:checkout', handleLocalCheckout);
    }

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('swift:pos:checkout', handleLocalCheckout);
      }
    };
  }, []);

  const kpiCards = [
    {
      title: 'Gross Revenue',
      badge: livePulse ? 'LIVE' : 'Today',
      badgeVariant: livePulse ? 'live' : 'default',
      value: `₱${grossRevenue.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtext: livePulse && salesIncrement !== null
        ? `+₱${salesIncrement.toFixed(2)} sale just received!`
        : '+14.2% vs yesterday',
      subtextColor: 'text-success',
      icon: PesoIcon,
    },
    {
      title: 'Work Orders Queue',
      badge: 'Service Bay',
      badgeVariant: 'default',
      value: '8 Active',
      subtext: '3 Pending Parts Assembly',
      subtextColor: 'text-accent',
      icon: Wrench,
    },
    {
      title: 'Net Profit Margin',
      badge: 'This Month',
      badgeVariant: 'default',
      value: '34.8%',
      subtext: '₱182,400.00 Gross Profit',
      subtextColor: 'text-success',
      icon: TrendingUp,
    },
    {
      title: 'Critical Low Stock',
      badge: 'Action Req',
      badgeVariant: 'danger',
      value: '3 SKUs',
      valueColor: 'text-danger',
      subtext: 'Below threshold limit',
      subtextColor: 'text-text-muted',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.title}
            className={`p-5 rounded-lg bg-bg-card border transition-all flex flex-col justify-between shadow-xs ${
              kpi.badgeVariant === 'live'
                ? 'border-success/60 ring-1 ring-success/30'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-text-muted shrink-0" />
                <span className="text-xs font-semibold text-text-muted">
                  {kpi.title}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  kpi.badgeVariant === 'danger'
                    ? 'bg-danger-light text-danger border border-danger/30'
                    : kpi.badgeVariant === 'live'
                    ? 'bg-success-light text-success border border-success/40 animate-pulse'
                    : 'bg-bg-muted text-text-secondary border border-border-subtle'
                }`}
              >
                {kpi.badgeVariant === 'live' && (
                  <Radio className="w-2.5 h-2.5 text-success animate-ping" />
                )}
                {kpi.badge}
              </span>
            </div>

            <div>
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  kpi.valueColor || 'text-text-primary'
                }`}
              >
                {kpi.value}
              </div>
              <div
                className={`text-xs font-semibold mt-1 flex items-center gap-1 ${kpi.subtextColor}`}
              >
                <span>{kpi.subtext}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
