import { z } from 'zod';

/**
 * Validates Philippine mobile phone format:
 * - 09XXXXXXXXX (11 digits)
 * - 09XX-XXX-XXXX or 09XX XXX XXXX
 * - +639XXXXXXXXX (12-13 digits)
 */
export const philippinePhoneRegex = /^(?:09\d{9}|09\d{2}[-\s]?\d{3}[-\s]?\d{4}|\+639\d{9})$/;

export const customerIntakeSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Customer full name must be at least 2 characters'),
  customerPhone: z
    .string()
    .trim()
    .regex(
      philippinePhoneRegex,
      'Valid Philippine mobile number required (e.g. 0917-123-4567 or 09171234567)'
    ),
  vehicleModel: z
    .string()
    .trim()
    .min(2, 'Vehicle make/model is required for repair jobs'),
  plateNumber: z
    .string()
    .trim()
    .min(2, 'Plate number or registration ID is required'),
  complaints: z
    .string()
    .trim()
    .min(3, 'Customer complaint or reason for service is required'),
});

export type CustomerIntakeInput = z.infer<typeof customerIntakeSchema>;

export const assignMechanicSchema = z.object({
  orderId: z.string().min(1, 'Work order ID is required'),
  mechanicId: z.string().min(1, 'Mechanic ID is required'),
  mechanicName: z.string().min(1, 'Mechanic name is required'),
});

export type AssignMechanicInput = z.infer<typeof assignMechanicSchema>;

export const onShiftMechanicSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  role: z.literal('mechanic'),
  status: z.enum(['on_shift', 'break']),
  clockInTime: z.string(),
});

export type OnShiftMechanic = z.infer<typeof onShiftMechanicSchema>;
