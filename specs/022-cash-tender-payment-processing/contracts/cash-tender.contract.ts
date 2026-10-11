import { z } from 'zod';

export const cashTenderCalculationSchema = z.object({
  totalDue: z.number().nonnegative(),
  cashTendered: z.number().nonnegative(),
  changeDue: z.number().nonnegative(),
  shortage: z.number().nonnegative(),
  isValid: z.boolean(),
  isExact: z.boolean()
});

export type CashTenderCalculation = z.infer<typeof cashTenderCalculationSchema>;

export const quickDenominationSchema = z.object({
  label: z.string().min(1),
  amount: z.number().positive(),
  isExact: z.boolean()
});

export type QuickDenomination = z.infer<typeof quickDenominationSchema>;

export interface CashTenderModalProps {
  isOpen: boolean;
  totalDue: number;
  isProcessing?: boolean;
  onClose: () => void;
  onConfirmPayment: (cashTendered: number, changeDue: number) => Promise<void> | void;
}
