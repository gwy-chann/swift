/**
 * Pure mathematical formulas for Motorcycle Parts Retail/Wholesale Margin & Markup
 * Invariant: Markup % is relative to Cost; Margin % is relative to Retail Price.
 */

export interface MarginSimulationParams {
  baseCost: number;
  simulatedRetailPrice: number;
  simulatedWholesalePrice?: number;
}

export interface MarginSimulationOutput {
  simulatedRetailPrice: number;
  simulatedGrossProfit: number;
  simulatedGrossMarkupPercent: number;
  simulatedGrossMarginPercent: number;
  isProfitable: boolean;
  isBelowCost: boolean;
  marginStatus: 'profitable' | 'low_margin' | 'below_cost';
}

/**
 * Calculates Gross Markup Percentage: (((retail - cost) / cost) * 100)
 * Example: Cost 280, Retail 450 -> 60.7%
 */
export function computeGrossMarkupPercent(retail: number, cost: number): number {
  if (cost <= 0) return 0;
  return Number((((retail - cost) / cost) * 100).toFixed(1));
}

/**
 * Calculates Wholesale Markup Percentage: (((wholesale - cost) / cost) * 100)
 * Example: Cost 280, Wholesale 380 -> 35.7%
 */
export function computeWholesaleMarkupPercent(wholesale: number, cost: number): number {
  if (cost <= 0) return 0;
  return Number((((wholesale - cost) / cost) * 100).toFixed(1));
}

/**
 * Calculates Gross Profit Margin Percentage: (((retail - cost) / retail) * 100)
 * Example: Cost 280, Retail 450 -> 37.8%
 */
export function computeGrossMarginPercent(retail: number, cost: number): number {
  if (retail <= 0) return 0;
  return Number((((retail - cost) / retail) * 100).toFixed(1));
}

/**
 * Calculates Senior Citizen / PWD statutory 20% discount price (RA 9994 / RA 10754)
 */
export function computeScPwdPrice(retail: number): number {
  if (retail <= 0) return 0;
  return Number((retail * 0.8).toFixed(2));
}

/**
 * Simulates financial outcome for a proposed price point against base cost
 */
export function simulateMarginOutput(params: MarginSimulationParams): MarginSimulationOutput {
  const { baseCost, simulatedRetailPrice } = params;
  const simulatedGrossProfit = Number((simulatedRetailPrice - baseCost).toFixed(2));
  const simulatedGrossMarkupPercent = computeGrossMarkupPercent(simulatedRetailPrice, baseCost);
  const simulatedGrossMarginPercent = computeGrossMarginPercent(simulatedRetailPrice, baseCost);
  const isProfitable = simulatedGrossProfit > 0;
  const isBelowCost = simulatedGrossProfit < 0;

  let marginStatus: 'profitable' | 'low_margin' | 'below_cost' = 'profitable';
  if (isBelowCost) {
    marginStatus = 'below_cost';
  } else if (simulatedGrossMarginPercent < 15) {
    marginStatus = 'low_margin';
  }

  return {
    simulatedRetailPrice,
    simulatedGrossProfit,
    simulatedGrossMarkupPercent,
    simulatedGrossMarginPercent,
    isProfitable,
    isBelowCost,
    marginStatus,
  };
}
