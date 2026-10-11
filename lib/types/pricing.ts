export interface PricingRules {
  id?: number;
  retailMarkup: number; // percentage, e.g. 35 (0 < markup <= 200)
  wholesaleMarkup: number; // percentage, e.g. 18 (0 < markup <= 200)
  aftermarketMarkup: number; // percentage, e.g. 40 (0 < markup <= 200)
  hourlyLaborRate: number; // hourly rate in PHP, e.g. 450 (rate >= 0)
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface PricingRulesRow {
  id: number;
  retail_markup: number | string;
  wholesale_markup: number | string;
  aftermarket_markup: number | string;
  hourly_labor_rate: number | string;
  updated_at: string;
  updated_by: string | null;
}

export interface PricingRulesAuditLog {
  id: string;
  changedBy: string | null;
  userName: string;
  oldRetailMarkup: number;
  newRetailMarkup: number;
  oldWholesaleMarkup: number;
  newWholesaleMarkup: number;
  oldAftermarketMarkup: number;
  newAftermarketMarkup: number;
  oldHourlyLaborRate: number;
  newHourlyLaborRate: number;
  reason?: string;
  createdAt: string;
}

export interface PricingRulesAuditLogRow {
  id: string;
  changed_by: string | null;
  user_name: string;
  old_retail_markup: number | string;
  new_retail_markup: number | string;
  old_wholesale_markup: number | string;
  new_wholesale_markup: number | string;
  old_aftermarket_markup: number | string;
  new_aftermarket_markup: number | string;
  old_hourly_labor_rate: number | string;
  new_hourly_labor_rate: number | string;
  reason?: string;
  created_at: string;
}
