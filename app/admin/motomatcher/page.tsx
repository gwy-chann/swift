import React from "react";
import { Search, Bike, CheckCircle2 } from "lucide-react";
import { getMotorcycleModelsAction } from "@/lib/actions/motomatcher-actions";

export default async function AdminMotoMatcherPage() {
  const models = await getMotorcycleModelsAction();

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">MotoMatcher Compatibility Search</h2>
          <p className="text-xs text-text-secondary">
            Motorcycle make, model, displacement selector and OEM vs aftermarket comparison.
          </p>
        </div>
      </div>

      {/* Model Catalog Grid */}
      <div className="p-5 bg-bg-surface border border-border rounded-xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-text-primary">
              Registered Motorcycle Platforms ({models.length})
            </h3>
          </div>
          <span className="text-xs font-semibold text-success bg-success-light px-2 py-0.5 rounded">
            Live Database Connected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {models.map((model) => (
            <div
              key={model.id}
              className="p-3.5 bg-bg-card border border-border rounded-lg flex items-center justify-between hover:border-primary transition-colors"
            >
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  {model.make} • {model.category}
                </span>
                <p className="text-xs font-bold text-text-primary mt-0.5">{model.model}</p>
                <span className="text-[10px] text-text-secondary font-medium">
                  {model.displacement_cc}cc • {model.year_start}
                  {model.year_end ? `-${model.year_end}` : '+'}
                </span>
              </div>
              <div className="w-7 h-7 rounded-full bg-primary-light text-primary flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
