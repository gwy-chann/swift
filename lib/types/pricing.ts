export interface PricingRules {
  retailMarkup: number; // percentage, e.g. 35
  wholesaleMarkup: number; // percentage, e.g. 18
  aftermarketMarkup: number; // percentage, e.g. 40
  hourlyLaborRate: number; // hourly rate in PHP, e.g. 450
}
