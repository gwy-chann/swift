"use client";

import React, { useState } from "react";
import { CheckCircle2, Bike } from "lucide-react";

export default function StaffCompatPage() {
  const [make, setMake] = useState("Yamaha");
  const [model, setModel] = useState("NMAX 155");

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
            <p className="text-xs text-text-muted">Select customer motorcycle to filter 100% verified parts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Make</label>
            <select
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-bg-input border border-border rounded-lg text-text-primary outline-hidden cursor-pointer"
            >
              <option value="Yamaha">Yamaha</option>
              <option value="Honda">Honda</option>
              <option value="Suzuki">Suzuki</option>
              <option value="Kawasaki">Kawasaki</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Model & Year</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-bg-input border border-border rounded-lg text-text-primary outline-hidden cursor-pointer"
            >
              <option value="NMAX 155">NMAX 155 (2020-2024)</option>
              <option value="Aerox 155">Aerox 155 V1 / V2</option>
              <option value="Sniper 155">Sniper 155 / R</option>
              <option value="Mio Gravis">Mio Gravis 125</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Engine / System</label>
            <select className="w-full py-2 px-3 text-xs bg-bg-input border border-border rounded-lg text-text-primary outline-hidden cursor-pointer">
              <option>All Systems (Full Bike)</option>
              <option>Drive & Transmission (CVT)</option>
              <option>Braking System</option>
              <option>Ignition & Electrical</option>
              <option>Engine & Lubrication</option>
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
              Verified Fitment Results for {make} {model}
            </h4>
          </div>
          <span className="text-xs font-bold text-success bg-success-light px-2 py-0.5 rounded">
            Direct Bolt-On Verified
          </span>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 bg-bg-card border border-border rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-text-muted">IGN-NGK-CR8</span>
              <p className="text-xs font-bold text-text-primary">NGK Laser Iridium Spark Plug CR8EIA-9</p>
              <span className="text-[10px] text-secondary font-semibold">Shelf: Aisle 2 - Shelf A</span>
            </div>
            <span className="text-sm font-bold font-mono text-primary">₱420.00</span>
          </div>

          <div className="p-3.5 bg-bg-card border border-border rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-text-muted">FL-MOT-10W40</span>
              <p className="text-xs font-bold text-text-primary">Motul 7100 4T 10W-40 1L (1.0L Engine Cap)</p>
              <span className="text-[10px] text-secondary font-semibold">Shelf: Aisle 3 - Shelf B</span>
            </div>
            <span className="text-sm font-bold font-mono text-primary">₱650.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
