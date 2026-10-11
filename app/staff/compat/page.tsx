"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle2, Bike, PackageOpen } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { getProductsAction } from "@/lib/admin/product-actions";

export default function StaffCompatPage() {
  const [make, setMake] = useState("Yamaha");
  const [model, setModel] = useState("Yamaha NMAX 155");
  const [systemCategory, setSystemCategory] = useState("ALL");
  const { products, hydrateProducts } = useInventoryStore();

  useEffect(() => {
    let isMounted = true;
    getProductsAction()
      .then((fetched) => {
        if (isMounted && fetched.length > 0) {
          hydrateProducts(fetched);
        }
      })
      .catch((error) => {
        console.error("Failed to load products for compatibility check:", error);
      });
    return () => {
      isMounted = false;
    };
  }, [hydrateProducts]);

  const compatibleParts = useMemo(() => {
    return products.filter((p) => {
      const modelMatch =
        p.model === model ||
        p.model === "Universal" ||
        (p.model?.toLowerCase().includes(model.toLowerCase()));

      const categoryMatch =
        systemCategory === "ALL" ||
        (p.category?.toLowerCase() === systemCategory.toLowerCase());

      return modelMatch && categoryMatch;
    });
  }, [products, model, systemCategory]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* MotoMatcher Selector Box */}
      <div className="p-5 bg-bg-surface border border-border rounded-xl shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
            <Bike className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">MotoMatcher Floor Compatibility Finder</h3>
            <p className="text-xs text-text-muted">Select customer motorcycle to filter 100% verified parts from live inventory</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Make</label>
            <select
              value={make}
              onChange={(e) => {
                const newMake = e.target.value;
                setMake(newMake);
                if (newMake === "Yamaha") setModel("Yamaha NMAX 155");
                else if (newMake === "Honda") setModel("Honda Click 125i/150i");
                else if (newMake === "Suzuki") setModel("Suzuki Raider 150 Fi");
                else setModel("Universal");
              }}
              className="w-full py-2 px-3 text-xs bg-bg-input border border-border rounded-lg text-text-primary outline-hidden cursor-pointer"
            >
              <option value="Yamaha">Yamaha</option>
              <option value="Honda">Honda</option>
              <option value="Suzuki">Suzuki</option>
              <option value="Universal">Universal / Multi-Fit</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Model & Platform</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-bg-input border border-border rounded-lg text-text-primary outline-hidden cursor-pointer"
            >
              {make === "Yamaha" && (
                <>
                  <option value="Yamaha NMAX 155">Yamaha NMAX 155</option>
                  <option value="Yamaha Aerox 155">Yamaha Aerox 155</option>
                </>
              )}
              {make === "Honda" && (
                <>
                  <option value="Honda Click 125i/150i">Honda Click 125i / 150i</option>
                  <option value="Honda ADV 160">Honda ADV 160</option>
                </>
              )}
              {make === "Suzuki" && (
                <option value="Suzuki Raider 150 Fi">Suzuki Raider 150 Fi</option>
              )}
              {make === "Universal" && (
                <option value="Universal">Universal Parts</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">System / Category</label>
            <select
              value={systemCategory}
              onChange={(e) => setSystemCategory(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-bg-input border border-border rounded-lg text-text-primary outline-hidden cursor-pointer"
            >
              <option value="ALL">All Systems & Categories</option>
              <option value="Brakes">Braking System</option>
              <option value="Drivetrain">Drive & Transmission (CVT)</option>
              <option value="Fluids">Engine Oils & Fluids</option>
              <option value="Ignition">Ignition & Electrical</option>
              <option value="Engine">Clutch & Engine Parts</option>
              <option value="Tires">Tires & Wheels</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compatible Verified Parts List */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Verified Fitment Results for {model} ({compatibleParts.length} Parts Available)
            </h4>
          </div>
          <span className="text-xs font-bold text-success bg-success-light px-2 py-0.5 rounded">
            Live Database Verified
          </span>
        </div>

        {compatibleParts.length > 0 ? (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {compatibleParts.map((part) => (
              <div
                key={part.sku}
                className="p-3.5 bg-bg-card border border-border rounded-lg flex items-center justify-between hover:border-primary transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted font-bold">{part.sku}</span>
                    {part.oem && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary-light text-primary font-bold">
                        OEM
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-text-primary mt-0.5">{part.name}</p>
                  <span className="text-[10px] text-secondary font-semibold">
                    Shelf: {part.location || "Floor Stock"} • Stock: {part.stock}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-primary">₱{part.retail.toFixed(2)}</span>
                  <span className="block text-[10px] text-text-muted font-mono">Wholesale: ₱{part.wholesale.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <PackageOpen className="w-8 h-8 text-text-muted mx-auto" />
            <p className="text-sm font-bold text-text-primary">No Matching Parts in Stock for {model}</p>
            <p className="text-xs text-text-muted">Try selecting &quot;All Systems&quot; or check universal inventory.</p>
          </div>
        )}
      </div>
    </div>
  );
}
