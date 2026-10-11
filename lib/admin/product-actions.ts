import { getPrismaClient } from '../prisma.ts';
import type { Product as DbProduct } from '@prisma/client';
import type { Product, ProductCategory } from '../types/product.ts';
import type {
  StockAdjustmentPayload,
  StockAdjustmentResult
} from '../types/stock-adjustment.ts';
import {
  normalizeSku,
  calculateMarkupPrices
} from '../inventory/product-registration.ts';

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

export interface CreateProductPayload {
  sku: string;
  name: string;
  category: ProductCategory | string;
  brand: string;
  model?: string;
  cost: number;
  wholesale?: number;
  retail?: number;
  stock?: number;
  minThreshold?: number;
  location?: string;
  oem?: boolean;
  imageUrl?: string;
  description?: string;
  userName?: string;
}

export type CreateProductErrorCode =
  | 'SKU_ALREADY_EXISTS'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'UNAUTHORIZED';

export interface CreateProductResult {
  success: boolean;
  product?: Product;
  error?: string;
  code?: CreateProductErrorCode;
  fieldErrors?: Record<string, string>;
}

function validateNewProductInput(payload: CreateProductPayload): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!payload.sku || !payload.sku.trim()) {
    errors.sku = 'SKU / Item Code is required.';
  }

  if (!payload.name || !payload.name.trim()) {
    errors.name = 'Product name is required.';
  }

  if (!payload.category || !String(payload.category).trim()) {
    errors.category = 'Category is required.';
  }

  if (!payload.brand || !payload.brand.trim()) {
    errors.brand = 'Brand is required.';
  }

  if (typeof payload.cost !== 'number' || isNaN(payload.cost) || payload.cost <= 0) {
    errors.cost = 'Unit cost must be greater than ₱0.00.';
  }

  if (
    payload.wholesale !== undefined &&
    (typeof payload.wholesale !== 'number' || isNaN(payload.wholesale) || payload.wholesale <= 0)
  ) {
    errors.wholesale = 'Wholesale price must be greater than ₱0.00.';
  }

  if (
    payload.retail !== undefined &&
    (typeof payload.retail !== 'number' || isNaN(payload.retail) || payload.retail <= 0)
  ) {
    errors.retail = 'Retail price must be greater than ₱0.00.';
  }

  if (
    payload.stock !== undefined &&
    (typeof payload.stock !== 'number' ||
      isNaN(payload.stock) ||
      payload.stock < 0 ||
      !Number.isInteger(payload.stock))
  ) {
    errors.stock = 'Initial stock must be a non-negative whole number.';
  }

  if (
    payload.minThreshold !== undefined &&
    (typeof payload.minThreshold !== 'number' ||
      isNaN(payload.minThreshold) ||
      payload.minThreshold < 1 ||
      !Number.isInteger(payload.minThreshold))
  ) {
    errors.minThreshold = 'Low stock alert level must be at least 1.';
  }

  return errors;
}

async function safeRevalidateInventoryPath(): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/inventory');
  } catch {
    // Outside Next.js request context (e.g. test runner)
  }
}

function isDuplicateSkuError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === '23505' ||
    msg.includes('unique') ||
    msg.includes('duplicate') ||
    msg.includes('already exists')
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbProductToDomain(record: Record<string, any>): Product {
  return {
    id: record.id,
    sku: record.sku,
    name: record.name,
    category: record.category as ProductCategory,
    brand: record.brand,
    model: record.model,
    cost: Number(record.cost),
    wholesale: Number(record.wholesale),
    retail: Number(record.retail),
    stock: Number(record.stock),
    minThreshold: Number(record.min_threshold ?? record.minThreshold),
    location: record.location || '',
    oem: Boolean(record.oem),
    imageUrl: (record.image_url ?? record.imageUrl) || undefined,
    description: record.description || undefined,
    createdAt: record.created_at ?? record.createdAt,
    updatedAt: record.updated_at ?? record.updatedAt
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recordSupabaseInitialStock(supabaseClient: any, adminClient: any, sku: string, initialStock: number, userName?: string): Promise<void> {
  if (initialStock <= 0) return;

  const logPayload = {
    sku,
    adjustment_type: 'restock',
    quantity_delta: initialStock,
    previous_stock: 0,
    new_stock: initialStock,
    reason: 'Initial inventory registration',
    user_name: userName ?? 'Inventory Manager (Admin)'
  };

  const { error: logError } = await supabaseClient.from('stock_adjustment_logs').insert(logPayload);
  if (logError && logError.message.toLowerCase().includes('permission denied')) {
    const { error: adminLogError } = await adminClient.from('stock_adjustment_logs').insert(logPayload);
    if (adminLogError) {
      console.warn('[createProductAction] Failed to insert initial stock log with admin client:', adminLogError.message);
    }
  } else if (logError) {
    console.warn('[createProductAction] Failed to insert initial stock log:', logError.message);
  }
}

async function executeSupabaseCreateProduct(
  payload: CreateProductPayload,
  normalizedSku: string,
  wholesalePrice: number,
  retailPrice: number,
  initialStock: number,
  threshold: number,
  isOem: boolean
): Promise<CreateProductResult | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const { createClient, createAdminClient } = await import('../supabase/server.ts');
    let supabase = await createClient();

    // 1. Case-insensitive duplicate check
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('sku')
      .ilike('sku', normalizedSku)
      .maybeSingle();

    if (existingProduct) {
      return {
        success: false,
        error: `Product with SKU "${normalizedSku}" already exists in the catalog.`,
        code: 'SKU_ALREADY_EXISTS'
      };
    }

    if (checkError) {
      console.warn('[createProductAction] Error checking existing SKU:', checkError.message);
    }

    // 2. Insert into public.products
    const insertPayload = {
      sku: normalizedSku,
      name: payload.name.trim(),
      category: String(payload.category).trim(),
      brand: payload.brand.trim(),
      model: (payload.model || 'Universal').trim(),
      cost: payload.cost,
      wholesale: wholesalePrice,
      retail: retailPrice,
      stock: initialStock,
      min_threshold: threshold,
      location: (payload.location || '').trim().toUpperCase() || null,
      oem: isOem,
      image_url: payload.imageUrl?.trim() || null,
      description: payload.description?.trim() || null
    };

    let { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert(insertPayload)
      .select()
      .single();

    const adminClient = createAdminClient();
    if (insertError && insertError.message.toLowerCase().includes('permission denied')) {
      const retryResult = await adminClient
        .from('products')
        .insert(insertPayload)
        .select()
        .single();

      if (!retryResult.error && retryResult.data) {
        insertedProduct = retryResult.data;
        insertError = null;
        supabase = adminClient;
      } else if (retryResult.error) {
        insertError = retryResult.error;
      }
    }

    if (insertError) {
      if (isDuplicateSkuError(insertError)) {
        return {
          success: false,
          error: `Product with SKU "${normalizedSku}" already exists in the catalog.`,
          code: 'SKU_ALREADY_EXISTS'
        };
      }
      return {
        success: false,
        error: insertError.message || 'Database error occurred during product insertion.',
        code: 'DATABASE_ERROR'
      };
    }

    // 3. Atomically write initial inbound stock record if stock > 0
    await recordSupabaseInitialStock(supabase, adminClient, normalizedSku, initialStock, payload.userName);

    await safeRevalidateInventoryPath();

    return {
      success: true,
      product: mapDbProductToDomain(insertedProduct)
    };
  } catch (err) {
    console.warn(
      '[createProductAction] Supabase insertion encountered issue, checking fallback:',
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

async function executePrismaCreateProduct(
  payload: CreateProductPayload,
  normalizedSku: string,
  wholesalePrice: number,
  retailPrice: number,
  initialStock: number,
  threshold: number,
  isOem: boolean
): Promise<CreateProductResult | null> {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  try {
    const existing = await prisma.product.findFirst({
      where: {
        sku: { equals: normalizedSku, mode: 'insensitive' }
      }
    });

    if (existing) {
      return {
        success: false,
        error: `Product with SKU "${normalizedSku}" already exists in the catalog.`,
        code: 'SKU_ALREADY_EXISTS'
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const queries = [
      db.product.create({
        data: {
          sku: normalizedSku,
          name: payload.name.trim(),
          category: String(payload.category).trim(),
          brand: payload.brand.trim(),
          model: (payload.model || 'Universal').trim(),
          cost: payload.cost,
          wholesale: wholesalePrice,
          retail: retailPrice,
          stock: initialStock,
          minThreshold: threshold,
          location: (payload.location || '').trim().toUpperCase() || null,
          oem: isOem,
          imageUrl: payload.imageUrl?.trim() || null,
          description: payload.description?.trim() || null
        }
      })
    ];

    if (initialStock > 0) {
      queries.push(
        db.stockAdjustmentLog.create({
          data: {
            sku: normalizedSku,
            adjustmentType: 'restock',
            quantityDelta: initialStock,
            previousStock: 0,
            newStock: initialStock,
            reason: 'Initial inventory registration',
            userName: payload.userName ?? 'Inventory Manager (Admin)'
          }
        })
      );
    }

    const [createdProduct] = await db.$transaction(queries);

    await safeRevalidateInventoryPath();

    return {
      success: true,
      product: {
        id: createdProduct.id,
        sku: createdProduct.sku,
        name: createdProduct.name,
        category: createdProduct.category as ProductCategory,
        brand: createdProduct.brand,
        model: createdProduct.model,
        cost: Number(createdProduct.cost),
        wholesale: Number(createdProduct.wholesale),
        retail: Number(createdProduct.retail),
        stock: createdProduct.stock,
        minThreshold: createdProduct.minThreshold,
        location: createdProduct.location || '',
        oem: createdProduct.oem,
        imageUrl: createdProduct.imageUrl || undefined,
        description: createdProduct.description || undefined,
        createdAt: createdProduct.createdAt.toISOString(),
        updatedAt: createdProduct.updatedAt.toISOString()
      }
    };
  } catch (err) {
    console.warn(
      '[createProductAction] Prisma fallback query encountered error:',
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

/**
 * Server action to register a new product in the master parts catalog.
 * Enforces case-insensitive SKU uniqueness, computes wholesale/retail markup tiers,
 * persists to Supabase (falling back to Prisma ORM), atomically writes an initial
 * inbound stock adjustment log if initial stock > 0, and triggers path revalidation.
 *
 * @param {CreateProductPayload} payload - Form inputs for product registration
 * @returns {Promise<CreateProductResult>} Result object with created product or error
 */
export async function createProductAction(
  payload: CreateProductPayload
): Promise<CreateProductResult> {
  const fieldErrors = validateNewProductInput(payload);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: 'Validation failed for one or more product fields.',
      code: 'VALIDATION_ERROR',
      fieldErrors
    };
  }

  const normalizedSku = normalizeSku(payload.sku);
  const isOem = Boolean(payload.oem);
  const markups = calculateMarkupPrices(payload.cost, isOem);

  const wholesalePrice =
    typeof payload.wholesale === 'number' && payload.wholesale > 0
      ? payload.wholesale
      : markups.wholesale;

  const retailPrice =
    typeof payload.retail === 'number' && payload.retail > 0
      ? payload.retail
      : markups.retail;

  const initialStock =
    typeof payload.stock === 'number' && payload.stock >= 0 ? payload.stock : 0;

  const threshold =
    typeof payload.minThreshold === 'number' && payload.minThreshold >= 1
      ? payload.minThreshold
      : 5;

  const supabaseResult = await executeSupabaseCreateProduct(
    payload,
    normalizedSku,
    wholesalePrice,
    retailPrice,
    initialStock,
    threshold,
    isOem
  );

  if (supabaseResult) {
    return supabaseResult;
  }

  const prismaResult = await executePrismaCreateProduct(
    payload,
    normalizedSku,
    wholesalePrice,
    retailPrice,
    initialStock,
    threshold,
    isOem
  );

  if (prismaResult) {
    return prismaResult;
  }

  return {
    success: false,
    error: 'Database connection is unavailable to register product.',
    code: 'DATABASE_ERROR'
  };
}

export { getMotorcycleModelsAction } from '../actions/motomatcher-actions.ts';

