import { z } from 'zod';

export const TerminalDeviceSchema = z.object({
  terminalId: z.string().min(1).default('Terminal #01'),
  deviceToken: z.string().min(1),
  deviceName: z.string().min(1).default('Primary Counter Laptop'),
  isAuthorized: z.boolean().default(true),
  enrolledAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().optional(),
  fingerprint: z.string().optional(),
});

export type TerminalDeviceContract = z.infer<typeof TerminalDeviceSchema>;

export const TerminalRegistrationInputSchema = z.object({
  terminalId: z.string().min(1).default('Terminal #01'),
  deviceName: z.string().min(1).default('Primary Counter Laptop'),
  masterPin: z.string().min(4).max(10),
});

export type TerminalRegistrationInputContract = z.infer<typeof TerminalRegistrationInputSchema>;

export const TerminalValidationResultSchema = z.object({
  valid: z.boolean(),
  terminalId: z.string().optional(),
  deviceName: z.string().optional(),
  errorCode: z.enum([
    'UNAUTHORIZED_TERMINAL_DEVICE',
    'TOKEN_EXPIRED',
    'DEVICE_REVOKED',
    'INVALID_PIN',
  ]).optional(),
  error: z.string().optional(),
});

export type TerminalValidationResultContract = z.infer<typeof TerminalValidationResultSchema>;

export const ClockInShiftInputSchema = z.object({
  terminalId: z.string().min(1).default('Terminal #01'),
  notes: z.string().optional(),
  profileId: z.string().uuid().optional(),
  deviceToken: z.string().optional(),
});

export type ClockInShiftInputContract = z.infer<typeof ClockInShiftInputSchema>;
