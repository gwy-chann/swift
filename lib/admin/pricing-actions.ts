'use server';

import type { PricingRules } from '../types/pricing.ts';
import { MOCK_PRICING_RULES } from '../mock-data/pricing.ts';

// In-memory store for pricing rules, initialized from baseline mock data
let memoryPricingRules: PricingRules = {
  ...MOCK_PRICING_RULES
};

export interface PricingActionResult<T = PricingRules> {
  success: boolean;
  data?: T;
  error?: string;
  code?: 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'UNAUTHORIZED';
}

async function safeRevalidatePaths(): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/rates');
    revalidatePath('/staff/pos');
  } catch {
    // Suppressed when executing in unit testing or environments without Next.js cache context
  }
}

/**
 * Pure calculation helper to compute dynamic time-pro-rated workshop labor charge.
 * Formula: round((minutes / 60) * hourlyRate, 2)
 */
export function calculateProRatedLaborCharge(
  durationMinutes: number,
  hourlyRate: number
): number {
  if (durationMinutes <= 0 || hourlyRate <= 0) {
    return 0;
  }
  const hours = durationMinutes / 60;
  return Math.round(hours * hourlyRate * 100) / 100;
}

/**
 * Server action to retrieve the active shop pricing rules including benchmark hourly labor rate.
 */
export async function getPricingRulesAction(): Promise<PricingRules> {
  try {
    // Optional integration with Supabase or Prisma if a store settings table is present
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('shop_pricing_rules')
      .select('*')
      .single();

    if (!error && data) {
      return {
        retailMarkup: Number(data.retail_markup ?? memoryPricingRules.retailMarkup),
        wholesaleMarkup: Number(data.wholesale_markup ?? memoryPricingRules.wholesaleMarkup),
        aftermarketMarkup: Number(data.aftermarket_markup ?? memoryPricingRules.aftermarketMarkup),
        hourlyLaborRate: Number(data.hourly_labor_rate ?? memoryPricingRules.hourlyLaborRate)
      };
    }
  } catch {
    // Fall back to memory pricing rules gracefully
  }

  return { ...memoryPricingRules };
}

/**
 * Server action to update pricing rules / benchmark hourly labor rate.
 */
export async function updatePricingRulesAction(
  updates: Partial<PricingRules> & { userName?: string }
): Promise<PricingActionResult<PricingRules>> {
  if (
    updates.hourlyLaborRate !== undefined &&
    (typeof updates.hourlyLaborRate !== 'number' || updates.hourlyLaborRate <= 0)
  ) {
    return {
      success: false,
      error: 'Hourly labor rate must be a positive number greater than 0',
      code: 'VALIDATION_ERROR'
    };
  }

  if (
    updates.retailMarkup !== undefined &&
    (typeof updates.retailMarkup !== 'number' || updates.retailMarkup < 0)
  ) {
    return {
      success: false,
      error: 'Retail markup must be a non-negative number',
      code: 'VALIDATION_ERROR'
    };
  }

  memoryPricingRules = {
    ...memoryPricingRules,
    ...updates
  };

  await safeRevalidatePaths();

  return {
    success: true,
    data: { ...memoryPricingRules }
  };
}
