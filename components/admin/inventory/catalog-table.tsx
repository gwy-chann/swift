import React from 'react';
import { MapPin, SlidersHorizontal, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Product } from '@/lib/types/product';
import { formatPeso, getStockHealthStatus } from '@/lib/inventory/catalog-filter';

interface CatalogTableProps {
  products: Product[];
  onAdjustStock?: (sku: string) => void;
}

export function CatalogTable({ products, onAdjustStock }: Readonly<CatalogTableProps>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-card shadow-xs">
      <table className="w-full text-left border-collapse min-w-212.5">
        <thead>
          <tr className="bg-bg-muted/70 border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            <th className="px-4 py-3.5">SKU</th>
            <th className="px-4 py-3.5">Part Name & Compatibility</th>
            <th className="px-4 py-3.5">Category</th>
            <th className="px-4 py-3.5">Shelf Locator</th>
            <th className="px-4 py-3.5">Stock Status</th>
            <th className="px-4 py-3.5 text-right">Retail Price</th>
            <th className="px-4 py-3.5 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {products.map((product) => {
            const healthStatus = getStockHealthStatus(product);

            return (
              <tr
                key={product.sku}
                className="hover:bg-bg-hover/50 transition-colors group"
              >
                {/* SKU Code */}
                <td className="px-4 py-3.5 align-middle">
                  <span className="font-mono text-xs font-bold text-text-primary px-2 py-1 rounded bg-bg-muted border border-border-subtle select-all">
                    {product.sku}
                  </span>
                </td>

                {/* Name & Model Fitment */}
                <td className="px-4 py-3.5 align-middle">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                        {product.name}
                      </span>
                      {product.oem ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-light text-primary border border-primary/20 shrink-0">
                          OEM Genuine
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-bg-muted text-text-muted border border-border-subtle shrink-0">
                          Aftermarket
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5">
                      <span className="font-medium text-text-secondary">{product.brand}</span>
                      <span className="text-text-muted">•</span>
                      <span className="text-text-muted">{product.model}</span>
                    </div>
                  </div>
                </td>

                {/* Category Badge */}
                <td className="px-4 py-3.5 align-middle">
                  <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-bg-muted text-text-secondary border border-border-subtle">
                    {product.category}
                  </span>
                </td>

                {/* Shelf Locator Tag */}
                <td className="px-4 py-3.5 align-middle">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-secondary-light text-secondary border border-secondary/20">
                    <MapPin className="w-3 h-3 text-secondary shrink-0" />
                    <span>{product.location}</span>
                  </span>
                </td>

                {/* Stock Level & Badge */}
                <td className="px-4 py-3.5 align-middle">
                  <div className="flex items-center gap-2">
                    {healthStatus === 'healthy' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-success-light text-success border border-success/30">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>{product.stock} Units</span>
                      </span>
                    )}

                    {healthStatus === 'low' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md bg-danger-light text-danger border border-danger/30">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{product.stock} Left (Min: {product.minThreshold})</span>
                      </span>
                    )}

                    {healthStatus === 'out_of_stock' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md bg-danger text-text-light">
                        <AlertOctagon className="w-3 h-3 shrink-0" />
                        <span>0 Out of Stock</span>
                      </span>
                    )}
                  </div>
                </td>

                {/* Retail Price in Philippine Pesos */}
                <td className="px-4 py-3.5 align-middle text-right">
                  <span className="text-sm font-black text-text-primary tracking-tight">
                    {formatPeso(product.retail)}
                  </span>
                </td>

                {/* Row Action: Adjust Stock */}
                <td className="px-4 py-3.5 align-middle text-center">
                  <button
                    type="button"
                    onClick={() => onAdjustStock?.(product.sku)}
                    aria-label={`Adjust stock for ${product.name}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-bg-muted hover:bg-primary hover:text-text-light text-text-primary border border-border-subtle hover:border-primary transition-all cursor-pointer shadow-2xs"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Adjust</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
