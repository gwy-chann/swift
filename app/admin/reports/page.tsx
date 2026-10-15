import React from 'react';
import { AdminReportsClient } from './admin-reports-client';
import { getCategoryPnlAction } from '@/lib/analytics/actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reports & Profit Analytics | SWIFT Admin',
  description:
    'Categorized Profit & Loss (P&L) breakdown, wholesale Cost of Goods Sold (COGS), and workshop labor margin analytics.',
};

export default async function AdminReportsPage() {
  const initialPnlData = await getCategoryPnlAction({ period: 'daily' });

  return (
    <AdminReportsClient
      initialPnlData={initialPnlData}
      initialPeriod="daily"
    />
  );
}
