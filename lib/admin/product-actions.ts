import { getPrismaClient } from '../prisma.ts';
import type { Product as DbProduct } from '@prisma/client';
import type { Product, ProductCategory } from '../types/product.ts';
import type {
  StockAdjustmentPayload,
  StockAdjustmentResult
} from '../types/stock-adjustment.ts';

interface RpcStockAdjustmentResult {
  sku?: string;
  previous_stock?: number | string;
  new_stock?: number | string;
  quantity_delta?: number | string;
  adjustment_type?: string;
  log_id?: string;
  user_name?: string;
}

/**
 * Server data-fetching action to retrieve the master motorcycle parts catalog.
 * Queries PostgreSQL via Supabase client with ascending name sorting, falling
 * back to Prisma ORM if needed. Returns empty list if no products are stored.
 *
 * @returns {Promise<Product[]>} Array of domain Product objects formatted for client hydration
 */
export async function getProductsAction(): Promise<Product[]> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (!error && dbProducts && dbProducts.length > 0) {
      return dbProducts.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category as ProductCategory,
        brand: p.brand,
        model: p.model,
        cost: Number(p.cost),
        wholesale: Number(p.wholesale),
        retail: Number(p.retail),
        stock: Number(p.stock),
        minThreshold: Number(p.min_threshold),
        location: p.location || '',
        oem: Boolean(p.oem),
        description: p.description || undefined,
        imageUrl: p.image_url || undefined,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
    }
  } catch (error) {
    console.warn(
      '[getProductsAction] Supabase query encountered issue, checking Prisma:',
      error instanceof Error ? error.message : String(error)
    );
  }

  try {
    const prismaClient = getPrismaClient();
    if (prismaClient) {
      const dbProducts = await prismaClient.product.findMany({
        orderBy: { name: 'asc' }
      });

      if (dbProducts && dbProducts.length > 0) {
        return dbProducts.map((p: DbProduct) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category as ProductCategory,
          brand: p.brand,
          model: p.model,
          cost: Number(p.cost),
          wholesale: Number(p.wholesale),
          retail: Number(p.retail),
          stock: p.stock,
          minThreshold: p.minThreshold,
          location: p.location || '',
          oem: p.oem,
          description: p.description || undefined,
          imageUrl: p.imageUrl || undefined,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString()
        }));
      }
    }
  } catch (error) {
    console.warn(
      '[getProductsAction] Prisma query fallback encountered error:',
      error instanceof Error ? error.message : String(error)
    );
  }

  return [];
}

function parseRpcResult(
  data: unknown,
  payload: StockAdjustmentPayload
): StockAdjustmentResult {
  const r = (typeof data === 'object' && data !== null ? data : {}) as RpcStockAdjustmentResult;
  const sku = typeof r.sku === 'string' ? r.sku : payload.sku;
  const adjustmentType = typeof r.adjustment_type === 'string' ? r.adjustment_type : payload.type;
  const logId = typeof r.log_id === 'string' ? r.log_id : '';
  const userName = typeof r.user_name === 'string' ? r.user_name : (payload.userName ?? 'Staff Member');

  return {
    success: true,
    sku,
    previousStock: Number(r.previous_stock ?? 0),
    newStock: Number(r.new_stock ?? 0),
    quantityDelta: Number(r.quantity_delta ?? payload.delta),
    adjustmentType,
    logId,
    userName
  };
}

function handleRpcError(
  error: { message?: string; details?: string },
  sku: string
): StockAdjustmentResult {
  const combined = `${error.message ?? ''} ${error.details ?? ''}`;

  if (combined.includes('INSUFFICIENT_STOCK')) {
    return {
      success: false,
      sku,
      error: `Insufficient stock for part ${sku}. Requested deduction exceeds available inventory count.`,
      code: 'INSUFFICIENT_STOCK'
    };
  }

  if (combined.includes('PRODUCT_NOT_FOUND')) {
    return {
      success: false,
      sku,
      error: `Product with SKU ${sku} was not found in the catalog.`,
      code: 'PRODUCT_NOT_FOUND'
    };
  }

  return {
    success: false,
    sku,
    error: error.message ?? 'Database error occurred during stock adjustment.',
    code: 'DATABASE_ERROR'
  };
}

async function executeSupabaseAdjustment(
  payload: StockAdjustmentPayload
): Promise<StockAdjustmentResult | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('adjust_product_stock', {
      p_sku: payload.sku,
      p_type: payload.type,
      p_delta: payload.delta,
      p_reason: payload.reason ?? '',
      p_user_name: payload.userName ?? 'Staff Member'
    });

    if (error) {
      return handleRpcError(error, payload.sku);
    }

    if (data && typeof data === 'object') {
      return parseRpcResult(data, payload);
    }
  } catch (err) {
    console.warn(
      '[adjustProductStockAction] Supabase RPC execution encountered an issue, checking fallback:',
      err instanceof Error ? err.message : String(err)
    );
  }

  return null;
}

async function executePrismaAdjustment(
  payload: StockAdjustmentPayload
): Promise<StockAdjustmentResult | null> {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  try {
    const dbProduct = await prisma.product.findUnique({
      where: { sku: payload.sku }
    });

    if (!dbProduct) {
      return {
        success: false,
        sku: payload.sku,
        error: `Product with SKU ${payload.sku} was not found.`,
        code: 'PRODUCT_NOT_FOUND'
      };
    }

    const newStock = dbProduct.stock + payload.delta;
    if (newStock < 0) {
      return {
        success: false,
        sku: payload.sku,
        error: `Insufficient stock for part ${payload.sku}. Current stock is ${dbProduct.stock}, requested deduction is ${Math.abs(payload.delta)}.`,
        code: 'INSUFFICIENT_STOCK'
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const [updatedProduct, createdLog] = await db.$transaction([
      db.product.update({
        where: { sku: payload.sku },
        data: { stock: newStock }
      }),
      db.stockAdjustmentLog.create({
        data: {
          sku: payload.sku,
          adjustmentType: payload.type,
          quantityDelta: payload.delta,
          previousStock: dbProduct.stock,
          newStock,
          reason: payload.reason ?? '',
          userName: payload.userName ?? 'Staff Member'
        }
      })
    ]);

    return {
      success: true,
      sku: updatedProduct.sku,
      previousStock: dbProduct.stock,
      newStock: updatedProduct.stock,
      quantityDelta: payload.delta,
      adjustmentType: createdLog.adjustmentType,
      logId: createdLog.id,
      userName: createdLog.userName
    };
  } catch (err) {
    console.warn(
      '[adjustProductStockAction] Prisma fallback query encountered error:',
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

/**
 * Server action to execute an atomic stock quantity adjustment with immutable audit logging.
 * Calls Supabase RPC `adjust_product_stock` which enforces row-level locking (FOR UPDATE),
 * floor-zero non-negative stock constraints, and automatic non-repudiation user attribution.
 *
 * @param {StockAdjustmentPayload} payload - Details of the adjustment (sku, type, delta, reason)
 * @returns {Promise<StockAdjustmentResult>} Result object containing updated stock or detailed error
 */
export async function adjustProductStockAction(
  payload: StockAdjustmentPayload
): Promise<StockAdjustmentResult> {
  if (payload.delta === 0) {
    return {
      success: false,
      sku: payload.sku,
      error: 'Adjustment delta cannot be zero.',
      code: 'ZERO_DELTA_NOT_ALLOWED'
    };
  }

  const rpcResult = await executeSupabaseAdjustment(payload);
  if (rpcResult) {
    return rpcResult;
  }

  const prismaResult = await executePrismaAdjustment(payload);
  if (prismaResult) {
    return prismaResult;
  }

  return {
    success: false,
    sku: payload.sku,
    error: 'Database connection is unavailable to perform stock adjustment.',
    code: 'DATABASE_ERROR'
  };
}
