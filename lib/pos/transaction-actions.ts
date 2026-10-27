'use server';

import { getPrismaClient } from '../prisma.ts';
import type { DbTransaction, ThermalReceiptData } from '../types/transaction.ts';
import { mapDbTransactionToThermalReceipt } from './contracts.ts';
import { MOCK_TRANSACTIONS } from './mock-transactions.ts';

interface SupabaseTransactionItemRow {
  id?: string;
  transaction_id?: string;
  item_type: 'part' | 'service';
  item_sku_or_code: string;
  item_name: string;
  unit_price: number | string;
  quantity: number;
  subtotal: number | string;
  bay?: string | null;
  shelf_location?: string | null;
}

interface SupabaseTransactionRow {
  id: string;
  receipt_number: string;
  cashier_id: string | null;
  cashier_name: string;
  pricing_mode: 'retail' | 'wholesale';
  subtotal: number | string;
  discount_type: string | null;
  discount_rate: number | string;
  discount_amount: number | string;
  total_due: number | string;
  cash_tendered: number | string;
  change_due: number | string;
  payment_method: string;
  created_at: string;
  items?: SupabaseTransactionItemRow[];
}

interface PrismaTransactionItemRecord {
  id: string;
  transactionId: string;
  itemType: string;
  itemSkuOrCode: string;
  itemName: string;
  unitPrice: { toString(): string } | number;
  quantity: number;
  subtotal: { toString(): string } | number;
  bay: string | null;
  shelfLocation: string | null;
}

interface PrismaTransactionRecord {
  id: string;
  receiptNumber: string;
  cashierId: string | null;
  cashierName: string;
  pricingMode: string;
  subtotal: { toString(): string } | number;
  discountType: string | null;
  discountRate: { toString(): string } | number;
  discountAmount: { toString(): string } | number;
  totalDue: { toString(): string } | number;
  cashTendered: { toString(): string } | number;
  changeDue: { toString(): string } | number;
  paymentMethod: string;
  createdAt: Date;
  items?: PrismaTransactionItemRecord[];
}

/**
 * Server action to retrieve recent transactions with their itemized lines.
 * Queries Supabase, falls back to Prisma, then MOCK_TRANSACTIONS.
 */
export async function getTransactionsAction(
  limit = 250,
  options?: { filterTestRecords?: boolean }
): Promise<DbTransaction[]> {
  const shouldFilterTests = options?.filterTestRecords ?? true;
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    let query = supabase
      .from('transactions')
      .select('*, items:transaction_items(*)')
      .order('created_at', { ascending: false });

    if (shouldFilterTests) {
      query = query
        .not('receipt_number', 'like', 'TX-TEST%')
        .not('receipt_number', 'like', 'TX-CLAIM%')
        .not('receipt_number', 'like', 'TX-77%')
        .not('receipt_number', 'like', 'TX-PARTS%')
        .not('receipt_number', 'like', 'TX-INTAKE%')
        .not('receipt_number', 'like', 'TX-MULTI%')
        .not('receipt_number', 'like', 'TX-DEFAULTS%');
    }

    const { data, error } = await query.limit(limit);

    if (!error && data) {
      const rows = data as unknown as SupabaseTransactionRow[];
      return rows.map((t) => ({
        id: t.id,
        receipt_number: t.receipt_number,
        cashier_id: t.cashier_id,
        cashier_name: t.cashier_name,
        pricing_mode: t.pricing_mode,
        subtotal: Number(t.subtotal),
        discount_type: t.discount_type,
        discount_rate: Number(t.discount_rate),
        discount_amount: Number(t.discount_amount),
        total_due: Number(t.total_due),
        cash_tendered: Number(t.cash_tendered),
        change_due: Number(t.change_due),
        payment_method: t.payment_method,
        created_at: t.created_at,
        items: (t.items || []).map((i) => ({
          id: i.id,
          transaction_id: i.transaction_id,
          item_type: i.item_type,
          item_sku_or_code: i.item_sku_or_code,
          item_name: i.item_name,
          unit_price: Number(i.unit_price),
          quantity: Number(i.quantity),
          subtotal: Number(i.subtotal),
          bay: i.bay,
          shelf_location: i.shelf_location,
        })),
      }));
    }
  } catch (error) {
    console.warn(
      '[getTransactionsAction] Supabase query encountered issue, trying Prisma fallback:',
      error instanceof Error ? error.message : String(error)
    );
  }

  // Fallback to Prisma ORM
  try {
    const prisma = getPrismaClient() as {
      transaction?: {
        findMany(args: {
          take: number;
          where?: unknown;
          orderBy: { createdAt: 'desc' };
          include: { items: boolean };
        }): Promise<PrismaTransactionRecord[]>;
      };
    } | null;

    if (prisma?.transaction) {
      const records = await prisma.transaction.findMany({
        take: limit,
        where: shouldFilterTests
          ? {
              NOT: [
                { receiptNumber: { startsWith: 'TX-TEST' } },
                { receiptNumber: { startsWith: 'TX-CLAIM' } },
                { receiptNumber: { startsWith: 'TX-77' } },
                { receiptNumber: { startsWith: 'TX-PARTS' } },
                { receiptNumber: { startsWith: 'TX-INTAKE' } },
                { receiptNumber: { startsWith: 'TX-MULTI' } },
                { receiptNumber: { startsWith: 'TX-DEFAULTS' } },
              ],
            }
          : undefined,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });

      if (records) {
        return records.map((t) => ({
          id: t.id,
          receipt_number: t.receiptNumber,
          cashier_id: t.cashierId,
          cashier_name: t.cashierName,
          pricing_mode: t.pricingMode as 'retail' | 'wholesale',
          subtotal: Number(t.subtotal),
          discount_type: t.discountType,
          discount_rate: Number(t.discountRate),
          discount_amount: Number(t.discountAmount),
          total_due: Number(t.totalDue),
          cash_tendered: Number(t.cashTendered),
          change_due: Number(t.changeDue),
          payment_method: t.paymentMethod,
          created_at: t.createdAt?.toISOString?.() || String(t.createdAt),
          items: (t.items || []).map((i) => ({
            id: i.id,
            transaction_id: i.transactionId,
            item_type: i.itemType as 'part' | 'service',
            item_sku_or_code: i.itemSkuOrCode,
            item_name: i.itemName,
            unit_price: Number(i.unitPrice),
            quantity: Number(i.quantity),
            subtotal: Number(i.subtotal),
            bay: i.bay,
            shelf_location: i.shelfLocation,
          })),
        }));
      }
    }
  } catch (error) {
    console.warn(
      '[getTransactionsAction] Prisma fallback query encountered issue:',
      error instanceof Error ? error.message : String(error)
    );
  }

  return [];
}

/**
 * Server action to retrieve a specific transaction by receipt number.
 * Queries Supabase first, falling back to cached list or test fixture fallback.
 */
export async function getTransactionByReceiptAction(
  receiptNumber: string
): Promise<DbTransaction | null> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*, items:transaction_items(*)')
      .eq('receipt_number', receiptNumber)
      .maybeSingle();

    if (!error && data) {
      const t = data as unknown as SupabaseTransactionRow;
      return {
        id: t.id,
        receipt_number: t.receipt_number,
        cashier_id: t.cashier_id,
        cashier_name: t.cashier_name,
        pricing_mode: t.pricing_mode,
        subtotal: Number(t.subtotal),
        discount_type: t.discount_type,
        discount_rate: Number(t.discount_rate),
        discount_amount: Number(t.discount_amount),
        total_due: Number(t.total_due),
        cash_tendered: Number(t.cash_tendered),
        change_due: Number(t.change_due),
        payment_method: t.payment_method,
        created_at: t.created_at,
        items: (t.items || []).map((i) => ({
          id: i.id,
          transaction_id: i.transaction_id,
          item_type: i.item_type,
          item_sku_or_code: i.item_sku_or_code,
          item_name: i.item_name,
          unit_price: Number(i.unit_price),
          quantity: Number(i.quantity),
          subtotal: Number(i.subtotal),
          bay: i.bay,
          shelf_location: i.shelf_location,
        })),
      };
    }
  } catch (err) {
    console.warn('[getTransactionByReceiptAction] Live query error:', err);
  }

  const all = await getTransactionsAction(250, { filterTestRecords: false });
  const found = all.find((t) => t.receipt_number === receiptNumber);
  if (found) return found;

  return MOCK_TRANSACTIONS.find((t) => t.receipt_number === receiptNumber) || null;
}



/**
 * Server action to retrieve a normalized thermal receipt by receipt number.
 */
export async function getThermalReceiptByReceiptAction(
  receiptNumber: string
): Promise<ThermalReceiptData | null> {
  const transaction = await getTransactionByReceiptAction(receiptNumber);
  if (!transaction) return null;
  return mapDbTransactionToThermalReceipt(transaction);
}

