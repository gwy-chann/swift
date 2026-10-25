import React from 'react';
import { Metadata } from 'next';
import { getTransactionsAction } from '@/lib/pos/transaction-actions';
import { PurchaseHistoryView } from '@/components/staff/history/purchase-history-view';

export const metadata: Metadata = {
  title: 'Payment & Sales History | SWIFT Admin',
  description: 'Search sales transactions, verify payments, and reprint thermal receipts.',
};

export const dynamic = 'force-dynamic';

export default async function AdminPaymentHistoryPage() {
  const transactions = await getTransactionsAction(100);

  return (
    <div className="w-full max-w-7xl mx-auto py-2 space-y-4 animate-in fade-in duration-200">
      <PurchaseHistoryView initialTransactions={transactions} />
    </div>
  );
}
