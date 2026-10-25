import { z } from 'zod';

export const PIN_ERROR_INVALID = 'Invalid PIN. Please try again.';
export const PIN_VALIDATION_ERROR_MSG = 'PIN must consist of 4 to 6 numeric digits.';

export const StaffPinSchema = z
  .string()
  .trim()
  .regex(/^\d{4,6}$/, PIN_VALIDATION_ERROR_MSG);

export const InitiateStaffLoginSchema = z.object({
  email: z.string().trim().min(1, 'Username or email is required.'),
  password: z.string().min(1, 'Password is required.'),
  selectedRole: z.enum(['admin', 'staff'] as const),
  rememberTerminal: z.boolean().default(true),
});

export const CompleteStaffTwoStepLoginSchema = z.object({
  pin: StaffPinSchema,
  rememberTerminal: z.boolean().default(true),
});

export type InitiateStaffLoginInput = z.infer<typeof InitiateStaffLoginSchema>;
export type CompleteStaffTwoStepLoginInput = z.infer<typeof CompleteStaffTwoStepLoginSchema>;

export interface PendingStaffSummary {
  userId: string;
  email: string;
  name: string;
  role: string;
  roleDisplay: string;
  targetUrl: string;
}

export interface InitiateStaffLoginResult {
  success: boolean;
  requiresPin: boolean;
  step: 'CREDENTIALS' | 'ENTER_PIN';
  staffSummary?: PendingStaffSummary;
  redirectTo?: string;
  error?: string;
  code?: 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE' | 'NETWORK_ERROR' | 'SUCCESS';
}

export interface CompleteStaffTwoStepLoginResult {
  success: boolean;
  redirectTo?: string;
  session?: {
    id: string;
    email: string;
    name: string;
    role: string;
    expiresAt: number;
  };
  error?: string;
  code?: 'INVALID_PIN' | 'CHALLENGE_EXPIRED' | 'ACCOUNT_INACTIVE' | 'SUCCESS';
}
