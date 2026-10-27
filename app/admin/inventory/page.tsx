import { Metadata } from 'next';
import { InventoryCatalog } from '@/components/admin/inventory/inventory-catalog';
import { getProductsAction } from '@/lib/admin/product-actions';
import { getPricingRulesAction } from '@/lib/admin/pricing-actions';

export const metadata: Metadata = {
  title: 'Inventory & Warehouse Stock | SWIFT Admin',
  description: 'Master parts catalog, warehouse shelf locator mapping, and real-time inventory search.'
};

interface AdminInventoryPageProps {
  searchParams?: Promise<{ filter?: string; status?: string }>;
}

export default async function AdminInventoryPage(props: AdminInventoryPageProps) {
  const [initialProducts, initialPricingRules, resolvedSearchParams] = await Promise.all([
    getProductsAction(),
    getPricingRulesAction(),
    props.searchParams ? props.searchParams : Promise.resolve(undefined),
  ]);

  const isLowStock =
    resolvedSearchParams?.status === 'low_stock' ||
    resolvedSearchParams?.filter === 'low_stock' ||
    resolvedSearchParams?.status === 'low' ||
    resolvedSearchParams?.filter === 'low';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Main Reactive Inventory Catalog View with Header & Actions */}
      <InventoryCatalog
        initialProducts={initialProducts}
        initialPricingRules={initialPricingRules}
        initialStockFilter={isLowStock ? 'low_stock' : 'all'}
        initialLowStockOnly={isLowStock}
      />
    </div>
  );
}

