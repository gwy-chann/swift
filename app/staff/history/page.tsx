import React from 'react';
import { Metadata } from 'next';
import { getTransactionsAction } from '@/lib/pos/transaction-actions';
import { PurchaseHistoryView } from '@/components/staff/history/purchase-history-view';

export const metadata: Metadata = {
  title: 'Purchase History | SWIFT Staff Terminal',
  description: 'Search sales transactions, verify 7-day part warranties, and preview thermal receipts.',
};

export const dynamic = 'force-dynamic';

export default async function StaffPurchaseHistoryPage() {
  const transactions = await getTransactionsAction(500, { filterTestRecords: true });

  return (
    <div className="w-full max-w-7xl mx-auto py-2">
      <PurchaseHistoryView initialTransactions={transactions} />
    </div>
  );
}
