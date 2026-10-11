import { getPrismaClient } from '@/lib/prisma';
import { Product, ProductCategory } from '@/lib/types/product';
import { MOCK_PRODUCTS } from '@/lib/mock-data/products';

/**
 * Server data-fetching function to retrieve master parts catalog for hydration.
 * Queries PostgreSQL via Prisma; if unpopulated or database is offline,
 * gracefully falls back to canonical MOCK_PRODUCTS.
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
