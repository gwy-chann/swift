"use client";

import React, { useState } from "react";
import { Zap, Search, ShoppingCart, CheckCircle2 } from "lucide-react";

function getCategoryLabel(category: string): string {
  if (category === "ALL") return "All Fast Items";
  if (category === "SERVICES") return "Add Labor / Bay Service";
  return category;
}

export default function StaffPosPage() {
  const [pricingMode, setPricingMode] = useState<"retail" | "wholesale">("retail");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["ALL", "SERVICES", "Brakes", "Drivetrain", "Fluids", "Ignition"];

  const mockFastItems = [
    { id: "1", name: "Motul 7100 4T 10W-40 1L", sku: "FL-MOT-10W40", price: 650, shelf: "Aisle 3 - Shelf B", cat: "Fluids" },
    { id: "2", name: "Brembo Front Brake Pads (Click/Vario)", sku: "BR-BRE-001", price: 850, shelf: "Aisle 1 - Shelf D", cat: "Brakes" },
    { id: "3", name: "Standard Bay Oil Change Labor", sku: "SRV-OIL-01", price: 150, shelf: "Service Bay", cat: "SERVICES" },
    { id: "4", name: "NGK Laser Iridium Spark Plug CR8EIA-9", sku: "IGN-NGK-CR8", price: 420, shelf: "Aisle 2 - Shelf A", cat: "Ignition" },
    { id: "5", name: "DID 428HD Roller Drive Chain 120L", sku: "DRV-DID-428HD", price: 1250, shelf: "Aisle 4 - Shelf C", cat: "Drivetrain" },
    { id: "6", name: "Tire Vulcanizing & Wheel Balancing", sku: "SRV-TIRE-02", price: 200, shelf: "Service Bay", cat: "SERVICES" },
  ];

  const filteredItems = mockFastItems.filter((item) => {
    const matchCat = activeCategory === "ALL" || item.cat === activeCategory;
    const matchQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-6.5rem)] animate-in fade-in duration-200">
      {/* Left Pane: Fast Item Catalog */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        {/* Catalog Header */}
        <div className="p-4 border-b border-border bg-bg-surface/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-text-primary">Fast-Lane Checkout</h3>
            </div>
            <div className="relative sm:w-80">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan Barcode / SKU & hit [ENTER]..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-input border border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-text-primary placeholder:text-text-muted outline-hidden"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat
                    ? "bg-primary text-white shadow-xs"
                    : "bg-bg-base text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-bg-card hover:border-primary border border-border rounded-lg flex flex-col justify-between gap-2.5 transition-all shadow-xs group cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono text-text-muted">{item.sku}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-muted font-bold text-text-secondary">
                      {item.shelf}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary group-hover:text-primary mt-1 line-clamp-2">
                    {item.name}
                  </h4>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-sm font-extrabold font-mono text-primary">
                    ₱{item.price.toFixed(2)}
                  </span>
                  <span className="text-[11px] font-semibold text-text-muted group-hover:text-primary flex items-center gap-1">
                    <span>+ Add</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Pane: Active Ticket / Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden shrink-0">
        {/* Ticket Header */}
        <div className="p-4 border-b border-border bg-bg-surface/50 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-secondary" />
              <span>Current Ticket</span>
            </div>
            <div className="text-[11px] text-text-muted font-mono">Ticket #TX-1043</div>
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-bg-base border border-border text-xs font-bold">
            <button
              type="button"
              onClick={() => setPricingMode("retail")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                pricingMode === "retail" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:text-text-primary"
              }`}
            >
              Retail
            </button>
            <button
              type="button"
              onClick={() => setPricingMode("wholesale")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                pricingMode === "wholesale" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:text-text-primary"
              }`}
            >
              Wholesale
            </button>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="p-3 bg-bg-base border border-border rounded-lg flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">Motul 7100 4T 10W-40 1L</p>
              <p className="text-[10px] text-text-muted font-mono">1 × ₱650.00</p>
            </div>
            <span className="text-xs font-bold font-mono text-text-primary">₱650.00</span>
          </div>

          <div className="p-3 bg-bg-base border border-border rounded-lg flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">Standard Bay Oil Change Labor</p>
              <p className="text-[10px] text-text-muted font-mono">1 × ₱150.00</p>
            </div>
            <span className="text-xs font-bold font-mono text-text-primary">₱150.00</span>
          </div>
        </div>

        {/* Summary & Checkout Footer */}
        <div className="p-4 border-t border-border bg-bg-surface/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Subtotal</span>
            <span className="font-mono font-bold text-text-primary">₱800.00</span>
          </div>
          <div className="flex items-center justify-between text-xs text-danger">
            <span>Discount (0% Standard)</span>
            <span className="font-mono font-bold">-₱0.00</span>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              className="flex-1 py-1 px-2 rounded bg-primary text-white text-[10px] font-bold shadow-xs text-center"
            >
              0% Standard
            </button>
            <button
              type="button"
              className="flex-1 py-1 px-2 rounded bg-bg-base hover:bg-bg-hover text-text-muted text-[10px] font-bold text-center border border-border transition-colors cursor-pointer"
            >
              5% VIP
            </button>
            <button
              type="button"
              className="flex-1 py-1 px-2 rounded bg-bg-base hover:bg-bg-hover text-text-muted text-[10px] font-bold text-center border border-border transition-colors cursor-pointer"
            >
              20% SC/PWD
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider">TOTAL DUE</span>
            <span className="text-lg font-black font-mono text-success">₱800.00</span>
          </div>

          <button
            type="button"
            className="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-extrabold shadow-md uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>COMPLETE SALE (F12)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
