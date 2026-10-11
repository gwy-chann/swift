/**
 * Cash Tender & Payment Processing Calculation Engine (SIAA-21 / STORY-3.4)
 * Pure domain logic for cash tender calculations, shortage warnings,
 * and Philippine Peso quick denomination suggestions.
 */

export interface CashTenderResult {
  totalDue: number;
  cashTendered: number;
  changeDue: number;
  shortage: number;
  isValid: boolean;
  isExact: boolean;
}

export interface QuickDenomination {
  label: string;
  amount: number;
  isExact: boolean;
}

/**
 * Rounds a financial amount half-up to two decimal places, guarding against floating-point inaccuracies.
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a monetary number in standard Philippine Peso currency style.
 */
export function formatPeso(amount: number): string {
  const rounded = roundMoney(amount);
  return `₱${rounded.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Calculates real-time change due or shortage amount for a given total and tendered cash.
 *
 * Rules:
 * - If cashTendered >= totalDue: isValid = true, changeDue = cashTendered - totalDue, shortage = 0
 * - If cashTendered < totalDue: isValid = false, changeDue = 0, shortage = totalDue - cashTendered
 * - If cashTendered === totalDue: isExact = true, changeDue = 0, shortage = 0
 */
export function calculateCashTender(totalDue: number, cashTendered: number): CashTenderResult {
  const roundedTotal = roundMoney(Math.max(0, totalDue));
  const roundedTendered = roundMoney(Math.max(0, cashTendered));

  if (roundedTendered < roundedTotal) {
    const shortage = roundMoney(roundedTotal - roundedTendered);
    return {
      totalDue: roundedTotal,
      cashTendered: roundedTendered,
      changeDue: 0,
      shortage,
      isValid: false,
      isExact: false
    };
  }

  const changeDue = roundMoney(roundedTendered - roundedTotal);
  return {
    totalDue: roundedTotal,
    cashTendered: roundedTendered,
    changeDue,
    shortage: 0,
    isValid: true,
    isExact: changeDue === 0
  };
}

/**
 * Generates smart Philippine Peso (PHP) quick denomination buttons.
 * Always includes the Exact amount, followed by next natural bill boundaries (50, 100, 500, 1000 multiples).
 *
 * For example:
 * Total Due ₱880.00 -> [Exact ₱880.00, ₱1,000.00, ₱1,500.00, ₱2,000.00]
 */
export function generateQuickDenominations(totalDue: number, maxCount = 4): QuickDenomination[] {
  const roundedTotal = roundMoney(Math.max(0, totalDue));

  if (roundedTotal <= 0) {
    return [
      { label: 'Exact ₱0.00', amount: 0, isExact: true },
      { label: '₱100.00', amount: 100, isExact: false },
      { label: '₱500.00', amount: 500, isExact: false },
      { label: '₱1,000.00', amount: 1000, isExact: false }
    ].slice(0, maxCount);
  }

  const denominations: QuickDenomination[] = [
    {
      label: `Exact ${formatPeso(roundedTotal)}`,
      amount: roundedTotal,
      isExact: true
    }
  ];

  const seenAmounts = new Set<number>([roundedTotal]);

  // Candidates based on standard PHP banknotes: 20, 50, 100, 200, 500, 1000
  const candidateAmounts: number[] = [];

  if (roundedTotal < 500) {
    // Next 50, next 100, next 500, 1000
    candidateAmounts.push(
      Math.ceil(roundedTotal / 50) * 50,
      Math.ceil(roundedTotal / 100) * 100,
      Math.ceil(roundedTotal / 500) * 500,
      1000
    );
  } else if (roundedTotal < 1000) {
    // e.g. ₱880 -> 1000, 1500, 2000
    candidateAmounts.push(
      1000,
      1500,
      2000,
      2500
    );
  } else {
    // >= 1000: round up to nearest 500 or 1000
    const next500 = Math.ceil(roundedTotal / 500) * 500;
    const base1000 = Math.ceil(roundedTotal / 1000) * 1000;
    candidateAmounts.push(
      next500 === roundedTotal ? next500 + 500 : next500,
      base1000 === roundedTotal ? base1000 + 1000 : base1000,
      base1000 + 1000,
      base1000 + 2000
    );
  }

  for (const amount of candidateAmounts) {
    const roundedAmt = roundMoney(amount);
    if (roundedAmt > roundedTotal && !seenAmounts.has(roundedAmt)) {
      seenAmounts.add(roundedAmt);
      denominations.push({
        label: formatPeso(roundedAmt),
        amount: roundedAmt,
        isExact: false
      });
      if (denominations.length >= maxCount) break;
    }
  }

  return denominations;
}
