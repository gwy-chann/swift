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
