import { Metadata } from 'next';
import { InventoryCatalog } from '@/components/admin/inventory/inventory-catalog';
import { getProductsAction } from '@/lib/admin/product-actions';

export const metadata: Metadata = {
  title: 'Inventory & Warehouse Stock | SWIFT Admin',
  description: 'Master parts catalog, warehouse shelf locator mapping, and real-time inventory search.'
};

export default async function AdminInventoryPage() {
  const initialProducts = await getProductsAction();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Main Reactive Inventory Catalog View with Header & Actions */}
      <InventoryCatalog initialProducts={initialProducts} showHeader={true} />
    </div>
  );
}
