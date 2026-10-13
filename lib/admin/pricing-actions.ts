'use server';

import type { PricingRules } from '../types/pricing.ts';
import { MOCK_PRICING_RULES } from '../mock-data/pricing.ts';
import { SWIFT_SEED_DATABASE } from '../mock-data/index.ts';

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

function validatePricingRuleUpdates(
  updates: Partial<PricingRules>
): string | null {
  if (
    updates.hourlyLaborRate !== undefined &&
    (typeof updates.hourlyLaborRate !== 'number' || updates.hourlyLaborRate <= 0)
  ) {
    return 'Hourly labor rate must be a positive number greater than 0';
  }

  if (
    updates.retailMarkup !== undefined &&
    (typeof updates.retailMarkup !== 'number' || updates.retailMarkup <= 0 || updates.retailMarkup > 200)
  ) {
    return 'Retail markup must be greater than 0% and cannot exceed 200%';
  }

  if (
    updates.wholesaleMarkup !== undefined &&
    (typeof updates.wholesaleMarkup !== 'number' || updates.wholesaleMarkup <= 0 || updates.wholesaleMarkup > 200)
  ) {
    return 'Wholesale markup must be greater than 0% and cannot exceed 200%';
  }

  if (
    updates.aftermarketMarkup !== undefined &&
    (typeof updates.aftermarketMarkup !== 'number' || updates.aftermarketMarkup <= 0 || updates.aftermarketMarkup > 200)
  ) {
    return 'Aftermarket markup must be greater than 0% and cannot exceed 200%';
  }

  return null;
}

function buildAuditActionDescription(
  previousRules: PricingRules,
  newRules: PricingRules,
  updates: Partial<PricingRules> & { reason?: string }
): string {
  const auditChanges: string[] = [];
  if (updates.retailMarkup !== undefined && updates.retailMarkup !== previousRules.retailMarkup) {
    auditChanges.push(`Retail from ${previousRules.retailMarkup}% to ${newRules.retailMarkup}%`);
  }
  if (updates.wholesaleMarkup !== undefined && updates.wholesaleMarkup !== previousRules.wholesaleMarkup) {
    auditChanges.push(`Wholesale from ${previousRules.wholesaleMarkup}% to ${newRules.wholesaleMarkup}%`);
  }
  if (updates.aftermarketMarkup !== undefined && updates.aftermarketMarkup !== previousRules.aftermarketMarkup) {
    auditChanges.push(`Aftermarket from ${previousRules.aftermarketMarkup}% to ${newRules.aftermarketMarkup}%`);
  }
  if (updates.hourlyLaborRate !== undefined && updates.hourlyLaborRate !== previousRules.hourlyLaborRate) {
    auditChanges.push(`Hourly Labor Rate from ₱${previousRules.hourlyLaborRate} to ₱${newRules.hourlyLaborRate}`);
  }

  return auditChanges.length > 0
    ? `Modified Global Pricing Markup rules: ${auditChanges.join(', ')}`
    : (updates.reason || 'Modified Global Pricing Markup rules');
}

async function persistPricingRulesToSupabase(
  newRules: PricingRules,
  previousRules: PricingRules,
  userName: string,
  reason?: string
): Promise<string | null> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    let userId: string | null = null;
    let resolvedUserName = userName;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        resolvedUserName = user.user_metadata?.full_name || user.email || userName;
      }
    } catch {
      // User auth context not available
    }

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
      const { error: auditError } = await supabase
        .from('pricing_rules_audit_logs')
        .insert({
          changed_by: userId,
          user_name: resolvedUserName,
          old_retail_markup: previousRules.retailMarkup,
          new_retail_markup: newRules.retailMarkup,
          old_wholesale_markup: previousRules.wholesaleMarkup,
          new_wholesale_markup: newRules.wholesaleMarkup,
          old_aftermarket_markup: previousRules.aftermarketMarkup,
          new_aftermarket_markup: newRules.aftermarketMarkup,
          old_hourly_labor_rate: previousRules.hourlyLaborRate,
          new_hourly_labor_rate: newRules.hourlyLaborRate,
          reason: reason || 'Admin global pricing update'
        });

      if (auditError) {
        console.error('[updatePricingRulesAction] Audit log insertion error:', auditError);
      }
    }

    return userId;
  } catch {
    return null;
  }
}

/**
 * Server action to update global pricing rules and benchmark hourly labor rate.
 * Validates bounds (0 < markup <= 200, labor >= 0), updates singleton row 1,
 * inserts an immutable audit log, and revalidates /admin/rates, /staff/pos, and /admin/inventory.
 */
export async function updatePricingRulesAction(
  updates: Partial<PricingRules> & { userName?: string; reason?: string }
): Promise<PricingActionResult<PricingRules>> {
  const validationError = validatePricingRuleUpdates(updates);
  if (validationError) {
    return {
      success: false,
      error: validationError,
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

  const userName = updates.userName || 'Admin Manager';
  const userId = await persistPricingRulesToSupabase(newRules, previousRules, userName, updates.reason);
  newRules.updatedBy = userId;

  memoryPricingRules = { ...newRules };
  SWIFT_SEED_DATABASE.pricingRules = { ...newRules };

  const actionDescription = buildAuditActionDescription(previousRules, newRules, updates);

  SWIFT_SEED_DATABASE.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    user: userName,
    action: actionDescription,
    ip: '192.168.1.100 (Admin Portal)'
  });

  await safeRevalidatePaths();

  return {
    success: true,
    data: { ...memoryPricingRules }
  };
}
