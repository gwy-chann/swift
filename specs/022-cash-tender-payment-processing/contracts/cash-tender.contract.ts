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

export const cashTenderModalPropsSchema = z.object({
  isOpen: z.boolean(),
  totalDue: z.number().nonnegative(),
  isProcessing: z.boolean().optional(),
  onClose: z.function().args().returns(z.void()),
  onConfirmPayment: z.function().args(z.number(), z.number()).returns(z.union([z.promise(z.void()), z.void()]))
});

export type CashTenderModalProps = z.infer<typeof cashTenderModalPropsSchema>;
