import { z } from 'zod';

export const TerminalErrorCodeSchema = z.enum([
  'UNAUTHORIZED_TERMINAL_DEVICE',
  'TOKEN_EXPIRED',
  'DEVICE_REVOKED',
  'INVALID_PIN',
]);

export const TerminalDeviceSchema = z.object({
  terminalId: z.string().min(1).default('Terminal #01'),
  deviceToken: z.string().min(1),
  deviceName: z.string().min(1).default('Primary Counter Laptop'),
  isAuthorized: z.boolean().default(true),
  enrolledAt: z.string(),
  lastUsedAt: z.string().optional(),
  fingerprint: z.string().optional(),
});

export const TerminalRegistrationInputSchema = z.object({
  terminalId: z.string().min(1).default('Terminal #01'),
  deviceName: z.string().min(1).default('Primary Counter Laptop'),
  masterPin: z.string().min(4).max(10),
});

export const TerminalValidationResultSchema = z.object({
  valid: z.boolean(),
  terminalId: z.string().optional(),
  deviceName: z.string().optional(),
  errorCode: TerminalErrorCodeSchema.optional(),
  error: z.string().optional(),
});

export const ClockInShiftInputSchema = z.object({
  terminalId: z.string().min(1).default('Terminal #01'),
  notes: z.string().optional(),
  profileId: z.string().uuid().optional(),
  deviceToken: z.string().optional(),
});
