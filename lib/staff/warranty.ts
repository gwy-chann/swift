export interface WarrantyStatus {
  readonly isValid: boolean;
  readonly daysElapsed: number;
  readonly daysRemaining: number;
  readonly label: string;
}

export const STORE_WARRANTY_DAYS = 7;
const MS_PER_DAY = 86_400_000;

/**
 * Evaluates whether a transaction is within the store's 7-day parts warranty window.
 *
 * @param timestamp - Purchase date/time (ISO string, epoch ms, or Date)
 * @param now - Reference current time (defaults to Date.now())
 */
export function calculateWarrantyStatus(
  timestamp: string | number | Date,
  now: Date = new Date()
): WarrantyStatus {
  const purchaseTime = new Date(timestamp).getTime();
  const currentTime = now.getTime();

  if (Number.isNaN(purchaseTime)) {
    return {
      isValid: false,
      daysElapsed: 0,
      daysRemaining: 0,
      label: 'Invalid Date',
    };
  }

  const elapsedMs = Math.max(0, currentTime - purchaseTime);
  const daysElapsed = Math.floor(elapsedMs / MS_PER_DAY);
  const daysRemaining = Math.max(0, STORE_WARRANTY_DAYS - daysElapsed);
  const isValid = elapsedMs <= STORE_WARRANTY_DAYS * MS_PER_DAY;

  let label: string;
  if (!isValid) {
    label = 'Warranty Expired';
  } else if (daysElapsed === 0) {
    label = 'Warranty Valid (Purchased Today)';
  } else if (daysRemaining === 1) {
    label = 'Warranty Valid (1 day left)';
  } else {
    label = `Warranty Valid (${daysRemaining} days left)`;
  }

  return {
    isValid,
    daysElapsed,
    daysRemaining,
    label,
  };
}
