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
    revalidatePath('/admin/inventory');
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
 * Queries public.pricing_rules (singleton row id=1) from Supabase with graceful fallback to memory.
 */
export async function getPricingRulesAction(): Promise<PricingRules> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) {
      const rules: PricingRules = {
        id: Number(data.id),
        retailMarkup: Number(data.retail_markup ?? memoryPricingRules.retailMarkup),
        wholesaleMarkup: Number(data.wholesale_markup ?? memoryPricingRules.wholesaleMarkup),
        aftermarketMarkup: Number(data.aftermarket_markup ?? memoryPricingRules.aftermarketMarkup),
        hourlyLaborRate: Number(data.hourly_labor_rate ?? memoryPricingRules.hourlyLaborRate),
        updatedAt: data.updated_at,
        updatedBy: data.updated_by
      };
      memoryPricingRules = { ...rules };
      return rules;
    }
  } catch {
    // Fall back to memory pricing rules gracefully
  }

  return { ...memoryPricingRules };
}

/**
 * Server action to update global pricing rules and benchmark hourly labor rate.
 * Validates bounds (0 < markup <= 200, labor >= 0), updates singleton row 1,
 * inserts an immutable audit log, and revalidates /admin/rates, /staff/pos, and /admin/inventory.
 */
export async function updatePricingRulesAction(
  updates: Partial<PricingRules> & { userName?: string; reason?: string }
): Promise<PricingActionResult<PricingRules>> {
  // Validate hourlyLaborRate
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

  // Validate retailMarkup (0 < markup <= 200)
  if (
    updates.retailMarkup !== undefined &&
    (typeof updates.retailMarkup !== 'number' || updates.retailMarkup <= 0 || updates.retailMarkup > 200)
  ) {
    return {
      success: false,
      error: 'Retail markup must be greater than 0% and cannot exceed 200%',
      code: 'VALIDATION_ERROR'
    };
  }

  // Validate wholesaleMarkup (0 < markup <= 200)
  if (
    updates.wholesaleMarkup !== undefined &&
    (typeof updates.wholesaleMarkup !== 'number' || updates.wholesaleMarkup <= 0 || updates.wholesaleMarkup > 200)
  ) {
    return {
      success: false,
      error: 'Wholesale markup must be greater than 0% and cannot exceed 200%',
      code: 'VALIDATION_ERROR'
    };
  }

  // Validate aftermarketMarkup (0 < markup <= 200)
  if (
    updates.aftermarketMarkup !== undefined &&
    (typeof updates.aftermarketMarkup !== 'number' || updates.aftermarketMarkup <= 0 || updates.aftermarketMarkup > 200)
  ) {
    return {
      success: false,
      error: 'Aftermarket markup must be greater than 0% and cannot exceed 200%',
      code: 'VALIDATION_ERROR'
    };
  }

  const previousRules = { ...memoryPricingRules };

  const newRules: PricingRules = {
    ...memoryPricingRules,
    retailMarkup: updates.retailMarkup ?? memoryPricingRules.retailMarkup,
    wholesaleMarkup: updates.wholesaleMarkup ?? memoryPricingRules.wholesaleMarkup,
    aftermarketMarkup: updates.aftermarketMarkup ?? memoryPricingRules.aftermarketMarkup,
    hourlyLaborRate: updates.hourlyLaborRate ?? memoryPricingRules.hourlyLaborRate,
    updatedAt: new Date().toISOString()
  };

  // Attempt Supabase persistence & audit logging
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    let userId: string | null = null;
    let userName = updates.userName || 'Admin Manager';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        userName = updates.userName || user.user_metadata?.full_name || user.email || 'Admin Manager';
      }
    } catch {
      // User auth context not available
    }

    newRules.updatedBy = userId;

    // 1. Update singleton row 1
    const { error: updateError } = await supabase
      .from('pricing_rules')
      .update({
        retail_markup: newRules.retailMarkup,
        wholesale_markup: newRules.wholesaleMarkup,
        aftermarket_markup: newRules.aftermarketMarkup,
        hourly_labor_rate: newRules.hourlyLaborRate,
        updated_at: newRules.updatedAt,
        updated_by: userId
      })
      .eq('id', 1);

    if (updateError) {
      console.error('[updatePricingRulesAction] Supabase update error:', updateError);
    } else {
      // 2. Insert immutable audit log record
      const { error: auditError } = await supabase
        .from('pricing_rules_audit_logs')
        .insert({
          changed_by: userId,
          user_name: userName,
          old_retail_markup: previousRules.retailMarkup,
          new_retail_markup: newRules.retailMarkup,
          old_wholesale_markup: previousRules.wholesaleMarkup,
          new_wholesale_markup: newRules.wholesaleMarkup,
          old_aftermarket_markup: previousRules.aftermarketMarkup,
          new_aftermarket_markup: newRules.aftermarketMarkup,
          old_hourly_labor_rate: previousRules.hourlyLaborRate,
          new_hourly_labor_rate: newRules.hourlyLaborRate,
          reason: updates.reason || 'Admin global pricing update'
        });

      if (auditError) {
        console.error('[updatePricingRulesAction] Audit log insertion error:', auditError);
      }
    }
  } catch {
    // In-memory fallback
  }

  memoryPricingRules = { ...newRules };

  await safeRevalidatePaths();

  return {
    success: true,
    data: { ...memoryPricingRules }
  };
}
