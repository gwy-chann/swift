'use server';

import { getPrismaClient } from '../prisma.ts';
import type { DbTransaction, ThermalReceiptData } from '../types/transaction.ts';


export const MOCK_TRANSACTIONS: DbTransaction[] = [
  {
    id: 't0000000-0000-0000-0000-000000000001',
    receipt_number: 'TX-1041',
    cashier_id: 'c0000000-0000-0000-0000-000000000002',
    cashier_name: 'SWIFT Fast-Lane Cashier',
    pricing_mode: 'retail',
    subtotal: 550.0,
    discount_type: 'none',
    discount_rate: 0.0,
    discount_amount: 0.0,
    total_due: 550.0,
    cash_tendered: 600.0,
    change_due: 50.0,
    payment_method: 'Cash',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    items: [
      {
        id: 'i0000000-0000-0000-0000-000000000001',
        transaction_id: 't0000000-0000-0000-0000-000000000001',
        item_type: 'part',
        item_sku_or_code: 'MOT-3100-10W40',
        item_name: 'Motul 3100 Gold 4T 10W40 (1L)',
        unit_price: 390.0,
        quantity: 1,
        subtotal: 390.0,
        bay: null,
        shelf_location: 'Aisle 1 / Shelf 1',
      },
      {
        id: 'i0000000-0000-0000-0000-000000000002',
        transaction_id: 't0000000-0000-0000-0000-000000000001',
        item_type: 'service',
        item_sku_or_code: 'SRV-OIL-01',
        item_name: 'Standard Oil & Gear Oil Change',
        unit_price: 100.0,
        quantity: 1,
        subtotal: 100.0,
        bay: 'Bay 1 / Quick Bay',
        shelf_location: null,
      },
      {
        id: 'i0000000-0000-0000-0000-000000000003',
        transaction_id: 't0000000-0000-0000-0000-000000000001',
        item_type: 'service',
        item_sku_or_code: 'SRV-TIRE-01',
        item_name: 'Tubeless Tire Mounting & Bead Sealing',
        unit_price: 60.0,
        quantity: 1,
        subtotal: 60.0,
        bay: 'Bay 1 / Quick Bay',
        shelf_location: null,
      },
    ],
  },
  {
    id: 't0000000-0000-0000-0000-000000000002',
    receipt_number: 'TX-1042',
    cashier_id: 'c0000000-0000-0000-0000-000000000002',
    cashier_name: 'SWIFT Fast-Lane Cashier',
    pricing_mode: 'retail',
    subtotal: 1200.0,
    discount_type: 'senior',
    discount_rate: 0.2,
    discount_amount: 240.0,
    total_due: 960.0,
    cash_tendered: 1000.0,
    change_due: 40.0,
    payment_method: 'GCash',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    items: [
      {
        id: 'i0000000-0000-0000-0000-000000000004',
        transaction_id: 't0000000-0000-0000-0000-000000000002',
        item_type: 'part',
        item_sku_or_code: 'HON-CLK-CVTB',
        item_name: 'OEM Drive Belt (Gates Bando)',
        unit_price: 850.0,
        quantity: 1,
        subtotal: 850.0,
        bay: null,
        shelf_location: 'Rack B-04 / Shelf 1',
      },
      {
        id: 'i0000000-0000-0000-0000-000000000005',
        transaction_id: 't0000000-0000-0000-0000-000000000002',
        item_type: 'service',
        item_sku_or_code: 'SRV-CVT-01',
        item_name: 'CVT Cleaning & Regreasing',
        unit_price: 350.0,
        quantity: 1,
        subtotal: 350.0,
        bay: 'Bay 2 / Scooter Bay',
        shelf_location: null,
      },
    ],
  },
  {
    id: 't0000000-0000-0000-0000-000000000003',
    receipt_number: 'TX-1043',
    cashier_id: 'c0000000-0000-0000-0000-000000000002',
    cashier_name: 'SWIFT Fast-Lane Cashier',
    pricing_mode: 'wholesale',
    subtotal: 2100.0,
    discount_type: 'none',
    discount_rate: 0.0,
    discount_amount: 0.0,
    total_due: 2100.0,
    cash_tendered: 2100.0,
    change_due: 0.0,
    payment_method: 'Card',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    items: [
      {
        id: 'i0000000-0000-0000-0000-000000000006',
        transaction_id: 't0000000-0000-0000-0000-000000000003',
        item_type: 'part',
        item_sku_or_code: 'RCB-NMAX-BP02',
        item_name: 'RCB S-Series Ceramic Brake Pads',
        unit_price: 480.0,
        quantity: 3,
        subtotal: 1440.0,
        bay: null,
        shelf_location: 'Rack A-01 / Shelf 3',
      },
      {
        id: 'i0000000-0000-0000-0000-000000000007',
        transaction_id: 't0000000-0000-0000-0000-000000000003',
        item_type: 'part',
        item_sku_or_code: 'DEN-IU24-IR',
        item_name: 'Denso Iridium Power Spark Plug (IU24)',
        unit_price: 520.0,
        quantity: 1,
        subtotal: 520.0,
        bay: null,
        shelf_location: 'Rack C-02 / Shelf 2',
      },
      {
        id: 'i0000000-0000-0000-0000-000000000008',
        transaction_id: 't0000000-0000-0000-0000-000000000003',
        item_type: 'service',
        item_sku_or_code: 'SRV-BRK-01',
        item_name: 'Brake Caliper Flush & Bleeding',
        unit_price: 140.0,
        quantity: 1,
        subtotal: 140.0,
        bay: 'Bay 3 / Mechanical Bay',
        shelf_location: null,
      },
    ],
  },
];

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
export async function getTransactionsAction(limit = 20): Promise<DbTransaction[]> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*, items:transaction_items(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
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
          orderBy: { createdAt: 'desc' };
          include: { items: boolean };
        }): Promise<PrismaTransactionRecord[]>;
      };
    } | null;

    if (prisma?.transaction) {
      const records = await prisma.transaction.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });

      if (records && records.length > 0) {
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
      '[getTransactionsAction] Prisma fallback query encountered issue, using mock:',
      error instanceof Error ? error.message : String(error)
    );
  }


  return MOCK_TRANSACTIONS.slice(0, limit);
}

/**
 * Server action to retrieve a specific transaction by receipt number.
 */
export async function getTransactionByReceiptAction(
  receiptNumber: string
): Promise<DbTransaction | null> {
  const all = await getTransactionsAction(100);
  return all.find((t) => t.receipt_number === receiptNumber) || null;
}

/**
 * Normalizes a database transaction into the standardized ThermalReceiptData structure.
 */
export function mapDbTransactionToThermalReceipt(t: DbTransaction): ThermalReceiptData {
  return {
    id: t.id || t.receipt_number,
    receiptNumber: t.receipt_number,
    timestamp: t.created_at || new Date().toISOString(),
    cashierName: t.cashier_name,
    pricingMode: t.pricing_mode,
    subtotal: t.subtotal,
    discountType: t.discount_type,
    discountRate: t.discount_rate,
    discountAmount: t.discount_amount,
    totalDue: t.total_due,
    cashTendered: t.cash_tendered,
    changeDue: t.change_due,
    paymentMethod: t.payment_method,
    technicianNotes: t.technician_notes || null,
    items: (t.items || []).map((item, idx) => ({
      id: item.id || `item-${idx}`,
      itemType: item.item_type,
      skuOrCode: item.item_sku_or_code,
      name: item.item_name,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      shelfLocation: item.shelf_location,
      bay: item.bay,
      duration: item.item_type === 'service' ? '15m' : undefined
    }))
  };
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

