import { getPrismaClient } from '@/lib/prisma';
import type { Product as DbProduct } from '@prisma/client';
import { Product, ProductCategory } from '@/lib/types/product';
import { MOCK_PRODUCTS } from '@/lib/mock-data/products';

/**
 * Server data-fetching action to retrieve the master motorcycle parts catalog.
 * Queries PostgreSQL via Prisma ORM with ascending name sorting; if the database
 * is unpopulated, unreachable, or unconfigured, gracefully falls back to canonical
 * mock products.
 *
 * @returns {Promise<Product[]>} Array of domain Product objects formatted for client hydration
 */
export async function getProductsAction(): Promise<Product[]> {
  try {
    const prismaClient = getPrismaClient();
    if (!prismaClient) {
      return [...MOCK_PRODUCTS.map((p) => ({ ...p }))];
    }

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
  } catch (error) {
    console.warn(
      '[getProductsAction] Database query fallback to mock products:',
      error instanceof Error ? error.message : String(error)
    );
  }

  return [...MOCK_PRODUCTS.map((p) => ({ ...p }))];
}
