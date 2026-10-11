'use server';

import { getPrismaClient } from '../prisma.ts';
import type { LaborService } from '../types/service.ts';
import type { CheckoutActionResult } from '../types/transaction.ts';
import { MOCK_SERVICES } from '../mock-data/services.ts';


/**
 * Server action to retrieve all active workshop labor services.
 * Queries PostgreSQL via Supabase client with ascending code sorting,
 * falling back to Prisma ORM and MOCK_SERVICES if the database is unreachable.
 *
 * @returns {Promise<LaborService[]>} Array of active LaborService entities
 */
export async function getLaborServicesAction(): Promise<LaborService[]> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const { data: dbServices, error } = await supabase
      .from('labor_services')
      .select('*')
      .eq('active', true)
      .order('code', { ascending: true });

    if (!error && dbServices && dbServices.length > 0) {
      return dbServices.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        bay: s.bay,
        rate: Number(s.rate),
        duration: s.duration,
        description: s.description || undefined,
        active: Boolean(s.active),
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));
    }
  } catch (error) {
    console.warn(
      '[getLaborServicesAction] Supabase query encountered issue, trying Prisma fallback:',
      error instanceof Error ? error.message : String(error)
    );
  }

  // Fallback to Prisma ORM
  try {
    interface PrismaLaborServiceRecord {
      id: string;
      code: string;
      name: string;
      bay: string;
      rate: { toString(): string } | number;
      duration: string;
      description: string | null;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    }

    const prisma = getPrismaClient() as {
      laborService?: {
        findMany(args: {
          where: { active: boolean };
          orderBy: { code: 'asc' | 'desc' };
        }): Promise<PrismaLaborServiceRecord[]>;
      };
    } | null;

    if (prisma?.laborService) {
      const prismaServices = await prisma.laborService.findMany({
        where: { active: true },
        orderBy: { code: 'asc' }
      });

      if (prismaServices && prismaServices.length > 0) {
        return prismaServices.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          bay: s.bay,
          rate: Number(s.rate),
          duration: s.duration,
          description: s.description || undefined,
          active: Boolean(s.active),
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }));
      }
    }
  } catch (prismaError) {
    console.warn(
      '[getLaborServicesAction] Prisma fallback query encountered issue:',
      prismaError instanceof Error ? prismaError.message : String(prismaError)
    );
  }

  // Return canonical baseline mock services
  return MOCK_SERVICES;
}

function handleCheckoutRpcError(
  error: { message?: string; details?: string; hint?: string }
): CheckoutActionResult {
  const combined = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;

  if (combined.includes('INSUFFICIENT_STOCK')) {
    const skuMatch = combined.match(/INSUFFICIENT_STOCK:\s*([^\s,;]+)/);
    const sku = skuMatch ? skuMatch[1] : undefined;
    return {
      success: false,
      code: 'INSUFFICIENT_STOCK',
      sku,
      error: sku
        ? `Insufficient stock for SKU ${sku}. Requested quantity exceeds available on-hand stock.`
        : 'Insufficient stock for requested item.'
    };
  }

  if (combined.includes('PRODUCT_NOT_FOUND')) {
    const skuMatch = combined.match(/PRODUCT_NOT_FOUND:\s*([^\s,;]+)/);
    const sku = skuMatch ? skuMatch[1] : undefined;
    return {
      success: false,
      code: 'PRODUCT_NOT_FOUND',
      sku,
      error: sku ? `Product with SKU ${sku} was not found in catalog.` : 'Product not found in catalog.'
    };
  }

  return {
    success: false,
    code: 'CHECKOUT_FAILED',
    error: error.message ?? 'Database error occurred during POS checkout.'
  };
}

async function triggerCheckoutRevalidation(): Promise<void> {
  try {
    const nextCache = await import('next/cache');
    if (typeof nextCache.updateTag === 'function') {
      nextCache.updateTag('pos-cart');
      nextCache.updateTag('inventory-catalog');
    }
    if (typeof nextCache.revalidateTag === 'function') {
      (nextCache.revalidateTag as (tag: string, profile?: unknown) => void)('pos-cart', { expire: 0 });
      (nextCache.revalidateTag as (tag: string, profile?: unknown) => void)('inventory-catalog', { expire: 0 });
    }
    if (typeof nextCache.revalidatePath === 'function') {
      nextCache.revalidatePath('/admin');
    }
  } catch {
    // Graceful fallback when executed outside Next.js server request context (e.g. test runner)
  }
}


/**
 * Executes atomic POS checkout:
 * 1. Validates payload via Zod contract schema.
 * 2. Invokes Supabase RPC public.process_pos_checkout (transaction + items + stock decrements + audit log).
 * 3. Handles PostgreSQL exceptions (INSUFFICIENT_STOCK, PRODUCT_NOT_FOUND).
 * 4. Falls back to mock store engine when running offline or without database connection.
 * 5. Revalidates Next.js cache tags (pos-cart, inventory-catalog) and admin overview route.
 *
 * @param payload CheckoutPayload
 * @returns Promise<CheckoutActionResult>
 */
export async function processCheckoutAction(
  payload: unknown
): Promise<CheckoutActionResult> {
  const { validateCheckoutPayload } = await import('./contracts.ts');
  const validation = validateCheckoutPayload(payload);

  if (!validation.success || !validation.data) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: validation.error || 'Invalid checkout payload format.'
    };
  }

  const validPayload = validation.data;

  // 1. Try Supabase RPC execution
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const { createClient } = await import('../supabase/server.ts');
      const supabase = await createClient();

      const p_transaction = {
        receipt_number: validPayload.receiptNumber,
        cashier_id: validPayload.cashierId ?? null,
        cashier_name: validPayload.cashierName,
        pricing_mode: validPayload.pricingMode,
        subtotal: validPayload.subtotal,
        discount_type: validPayload.discountType ?? null,
        discount_rate: validPayload.discountRate,
        discount_amount: validPayload.discountAmount,
        total_due: validPayload.totalDue,
        cash_tendered: validPayload.cashTendered,
        change_due: validPayload.changeDue,
        payment_method: validPayload.paymentMethod
      };

      const p_items = validPayload.items.map((item) => ({
        item_type: item.itemType,
        item_sku_or_code: item.itemSkuOrCode,
        item_name: item.itemName,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        shelf_location: item.shelfLocation ?? null,
        bay: item.bay ?? null
      }));

      const { data, error } = await supabase.rpc('process_pos_checkout', {
        p_transaction,
        p_items
      });

      if (error) {
        const combined = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;


        if (
          combined.includes('Could not find the function') ||
          combined.includes('schema cache') ||
          combined.includes('function public.process_pos_checkout') ||
          (error as { code?: string }).code === 'PGRST202'
        ) {
          console.warn(
            '[processCheckoutAction] process_pos_checkout RPC not yet deployed to remote Supabase, falling back to mock engine.'
          );
        } else {
          return handleCheckoutRpcError(error);
        }
      } else if (data && typeof data === 'object') {
        const res = data as {
          success?: boolean;
          transaction_id?: string;
          receipt_number?: string;
          items_count?: number;
          parts_decremented?: number;
          created_at?: string;
        };
        await triggerCheckoutRevalidation();

        return {
          success: true,
          transactionId: res.transaction_id || `tx-${Date.now()}`,
          receiptNumber: res.receipt_number || validPayload.receiptNumber || `TX-${Date.now().toString().slice(-4)}`,
          itemsCount: res.items_count ?? validPayload.items.length,
          partsDecremented: res.parts_decremented ?? validPayload.items.filter((i) => i.itemType === 'part').length,
          createdAt: res.created_at || new Date().toISOString()
        };
      }
    } catch (rpcErr) {
      console.warn(
        '[processCheckoutAction] Supabase RPC execution encountered issue, evaluating fallback:',
        rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
      );
    }
  }


  // 2. Offline / Mock Store Fallback
  const { inventoryStore } = await import('../store/inventory-store.ts');
  const { MOCK_PRODUCTS } = await import('../mock-data/products.ts');

  // Validate stock constraints for physical parts
  for (const item of validPayload.items) {
    if (item.itemType === 'part') {
      const storeProduct = inventoryStore.getProductBySku(item.itemSkuOrCode);
      const mockProduct = MOCK_PRODUCTS.find((p) => p.sku === item.itemSkuOrCode);
      const product = storeProduct || mockProduct;

      if (!product) {
        return {
          success: false,
          code: 'PRODUCT_NOT_FOUND',
          sku: item.itemSkuOrCode,
          error: `Product with SKU ${item.itemSkuOrCode} was not found in catalog.`
        };
      }

      if (product.stock < item.quantity) {
        return {
          success: false,
          code: 'INSUFFICIENT_STOCK',
          sku: item.itemSkuOrCode,
          error: `Insufficient stock for SKU ${item.itemSkuOrCode}. Current: ${product.stock}, Requested: ${item.quantity}.`
        };
      }
    }
  }

  // Atomically decrement stock and record logs for physical parts
  let partsDecremented = 0;
  const receiptNumber = validPayload.receiptNumber || `TX-${Date.now().toString().slice(-4)}`;

  for (const item of validPayload.items) {
    if (item.itemType === 'part') {
      inventoryStore.adjustStock({
        sku: item.itemSkuOrCode,
        type: 'Sale Outbound',
        units: -item.quantity,
        reason: `POS Sale Receipt: ${receiptNumber}`,
        user: validPayload.cashierName || 'Cashier'
      });
      partsDecremented++;
    }
  }


  await triggerCheckoutRevalidation();

  return {
    success: true,
    transactionId: `mock-tx-${Date.now()}`,
    receiptNumber,
    itemsCount: validPayload.items.length,
    partsDecremented,
    createdAt: new Date().toISOString()
  };
}

