"use client";

import React, { useState } from "react";
import { PackageSearch, Search, MapPin } from "lucide-react";

export default function StaffSearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("ALL");

  const mockInventory = [
    { sku: "FL-MOT-10W40", name: "Motul 7100 4T 10W-40 1L", model: "Universal 4-Stroke", shelf: "Aisle 3 - Shelf B", stock: 24, price: 650, cat: "Fluids" },
    { sku: "BR-BRE-001", name: "Brembo Front Brake Pads", model: "Honda Click 125/150, Vario", shelf: "Aisle 1 - Shelf D", stock: 12, price: 850, cat: "Brakes" },
    { sku: "DRV-DID-428HD", name: "DID 428HD Roller Drive Chain 120L", model: "Yamaha Sniper 150/155, Raider 150", shelf: "Aisle 4 - Shelf C", stock: 8, price: 1250, cat: "Drivetrain" },
    { sku: "IGN-NGK-CR8", name: "NGK Laser Iridium Spark Plug CR8EIA-9", model: "Yamaha NMAX 155, Aerox 155", shelf: "Aisle 2 - Shelf A", stock: 35, price: 420, cat: "Ignition" },
    { sku: "TIR-MIC-CTY2", name: "Michelin City Extra Front Tire 90/80-14", model: "Honda Beat, Click, Yamaha Mio", shelf: "Rack T-02", stock: 6, price: 1850, cat: "Tires" },
  ];

  const filtered = mockInventory.filter((item) => {
    const matchCat = category === "ALL" || item.cat === category;
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shelf.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
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
          <option value="ALL">All Categories (Parts & Accessories)</option>
          <option value="Brakes">Brakes</option>
          <option value="Drivetrain">Drivetrain</option>
          <option value="Fluids">Fluids</option>
          <option value="Ignition">Ignition</option>
          <option value="Tires">Tires</option>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.sku} className="hover:bg-bg-hover transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-text-primary">{item.sku}</td>
                  <td className="py-3 px-4 font-semibold text-text-primary">{item.name}</td>
                  <td className="py-3 px-4 text-text-secondary">{item.model}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/15 text-secondary font-bold">
                      <MapPin className="w-3 h-3" />
                      <span>{item.shelf}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-text-primary">{item.stock}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-primary">₱{item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
