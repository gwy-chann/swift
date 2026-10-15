import React from 'react';
import { getCategoryPnlBreakdownAction } from '@/lib/admin/pnl-actions';
import { ReportsViewClient } from '@/components/admin/reports/reports-view-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reports & Profit Analytics | SWIFT Admin',
  description:
    'Categorized Profit & Loss (P&L) breakdown, wholesale Cost of Goods Sold (COGS), and workshop labor margin analytics.',
};

export default async function AdminReportsPage() {
  const result = await getCategoryPnlBreakdownAction('daily');

  return (
    <ReportsViewClient
      initialData={result.data}
      initialPeriod="daily"
      initialInvoiceCount={result.invoiceCount}
    />
  );
}
