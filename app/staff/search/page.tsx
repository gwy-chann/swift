'use client';

import React, { useState, useEffect, useMemo } from "react";
import { PackageSearch, Search, MapPin, AlertCircle, X, SlidersHorizontal, Lock } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { usePunchStore } from "@/lib/store/punch-store";
import { getProductsAction } from "@/lib/admin/product-actions";
import { useInventoryRealtime } from "@/lib/hooks/use-inventory-realtime";
import { StockAdjustmentModal } from "@/components/admin/inventory/stock-adjustment-modal";
import { ManagerOverrideModal } from "@/components/pos/manager-override-modal";
import type { Product } from "@/lib/types/product";
import type { AdjustmentType } from "@/lib/inventory/stock-adjustment";
import { TablePagination, usePagination } from "@/components/common/table-pagination";

function getAdjustButtonTitle(isRestrictedRole: boolean, isMechanic: boolean): string {
  if (!isRestrictedRole) return "Adjust physical stock count";
  return isMechanic
    ? "Mechanics are not allowed to adjust stock count"
    : "Cashiers are not allowed to adjust stock count";
}

export default function StaffSearchPage() {
  const punchState = usePunchStore();
  const roleLower = (punchState.currentStaffRole || "").toLowerCase().trim();
  const isInventoryClerk =
    roleLower === "inventory_clerk" ||
    roleLower === "inventory clerk" ||
    roleLower.includes("clerk") ||
    roleLower.includes("inventory") ||
    punchState.currentStaff === "Rico Santos";
  const isAdmin = roleLower === "admin";
  const isCashier =
    (roleLower === "cashier" || roleLower.includes("cashier") || punchState.currentStaff === "Mike Morales") &&
    !isInventoryClerk &&
    !isAdmin;
  const isMechanic =
    (roleLower === "mechanic" || roleLower.includes("mechanic") || punchState.currentStaff === "Dante Reyes") &&
    !isInventoryClerk &&
    !isAdmin;
  const isRestrictedRole = isCashier || isMechanic;
  const canAdjustStock = Boolean(
    (isInventoryClerk ||
    isAdmin ||
    punchState.currentPermissions?.can_adjust_stock) &&
    !isRestrictedRole
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isRestrictedModalOpen, setIsRestrictedModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const storedToast = sessionStorage.getItem("swift_staff_redirect_toast");
        if (storedToast) {
          sessionStorage.removeItem("swift_staff_redirect_toast");
          return storedToast;
        }
      }
    } catch {}
    return null;
  });
  const { products, hydrateProducts, adjustStock } = useInventoryStore();

  // Real-time synchronization with Supabase products table
  useInventoryRealtime();

  // Auto-dismiss redirect toast notification after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    let isMounted = true;
    getProductsAction().then((fetched) => {
      if (isMounted && fetched.length > 0) {
        hydrateProducts(fetched);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [hydrateProducts]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add("ALL");
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((item) => {
      const matchCat = category === "ALL" || item.category === category;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.model && item.model.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [products, category, searchTerm]);

  const pagination = usePagination(filtered, 10);
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [searchTerm, category, resetPage]);

  const handleRequestAdjustStock = (item: Product) => {
    setSelectedProduct(item);

    // Cashier and mechanic role restriction: override is disabled; validate that they are not allowed to adjust stock
    if (isRestrictedRole) {
      setIsRestrictedModalOpen(true);
      return;
    }

    // Inventory clerks (and admins or users with stock adjustment permissions) manipulate stock directly without a master code
    if (canAdjustStock) {
      setIsAdjustmentModalOpen(true);
    } else {
      setIsOverrideModalOpen(true);
    }
  };

  const handleOverrideSuccess = () => {
    setIsOverrideModalOpen(false);
    setIsAdjustmentModalOpen(true);
  };

  const handleAdjustmentSubmit = (params: {
    sku: string;
    type: AdjustmentType;
    delta: number;
    reason: string;
  }) => {
    if (isRestrictedRole || !canAdjustStock) {
      setIsAdjustmentModalOpen(false);
      setSelectedProduct(null);
      setIsRestrictedModalOpen(true);
      return;
    }

    adjustStock({
      sku: params.sku,
      type: params.type,
      units: params.delta,
      reason: params.reason,
      user: punchState.currentStaff || "Staff Member",
    });
    setIsAdjustmentModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Toast Notification Banner (Redirect only) */}
      {toastMessage && (
        <div className="p-3 rounded-lg border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md bg-warning/10 text-warning border-warning/30 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-4 bg-bg-surface border border-border rounded-xl shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Part, Model, or SKU for instant shelf location..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-bg-input border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-text-primary placeholder:text-text-muted outline-hidden"
            autoFocus
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full sm:w-64 py-2 px-3 text-xs bg-bg-input border border-border rounded-lg text-text-primary outline-hidden cursor-pointer"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "ALL" ? "All Categories (Parts & Accessories)" : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Stock & Location Table Card */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageSearch className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-text-primary">Warehouse Stock & Physical Location Navigator</h3>
          </div>
          <span className="text-xs text-text-muted">{filtered.length} matching items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bg-base/60 text-text-muted font-bold border-b border-border">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Part / Accessory Name</th>
                <th className="py-3 px-4">Target Model</th>
                <th className="py-3 px-4">Physical Shelf Location</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-right">Retail Price</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagination.paginatedItems.map((item) => (
                <tr key={item.sku} className="hover:bg-bg-hover transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-text-primary">{item.sku}</td>
                  <td className="py-3 px-4 font-semibold text-text-primary">{item.name}</td>
                  <td className="py-3 px-4 text-text-secondary">{item.model}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/15 text-secondary font-bold">
                      <MapPin className="w-3 h-3" />
                      <span>{item.location || "Floor Stock"}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-text-primary">{item.stock}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-primary">₱{item.retail.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleRequestAdjustStock(item)}
                      className={
                        isRestrictedRole
                          ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-bg-base text-text-muted border border-border hover:border-danger/40 hover:text-danger hover:bg-danger/5 transition-colors cursor-pointer shadow-2xs"
                          : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-primary-light text-primary border border-primary/20 hover:bg-primary hover:text-text-light transition-colors cursor-pointer shadow-2xs"
                      }
                      title={getAdjustButtonTitle(isRestrictedRole, isMechanic)}
                    >
                      {isRestrictedRole ? (
                        <Lock className="w-3 h-3 text-text-muted" />
                      ) : (
                        <SlidersHorizontal className="w-3 h-3" />
                      )}
                      <span>Adjust Stock</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          itemName="items"
        />
      </div>

      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        product={selectedProduct}
        onClose={() => {
          setIsAdjustmentModalOpen(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleAdjustmentSubmit}
      />

      {/* Role Restriction Validation Modal */}
      {isRestrictedModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-restriction-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-border bg-bg-card flex items-center justify-between">
              <div>
                <h3 id="role-restriction-title" className="text-sm font-extrabold text-text-primary">
                  Adjustment Not Allowed
                </h3>
                <p className="text-[11px] text-text-muted font-medium">
                  {isMechanic ? "Mechanic" : "Cashier"} Role Permission Restriction
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRestrictedModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger font-medium leading-relaxed">
                {isMechanic ? "Mechanics" : "Cashiers"} are not allowed to adjust stock count. Physical inventory adjustments are strictly reserved for <strong>Inventory Clerks</strong> and <strong>Administrators</strong>.
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestrictedModalOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-primary text-text-light hover:bg-primary-hover transition-colors cursor-pointer shadow-xs text-center"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Elevation Override only for non-restricted roles */}
      {!isRestrictedRole && (
        <ManagerOverrideModal
          isOpen={isOverrideModalOpen}
          onClose={() => {
            setIsOverrideModalOpen(false);
            setSelectedProduct(null);
          }}
          onOverrideSuccess={handleOverrideSuccess}
        />
      )}
    </div>
  );
}
