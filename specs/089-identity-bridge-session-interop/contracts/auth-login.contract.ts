import { z } from "zod";

export const PortalRoleSchema = z.enum(["admin", "staff"]);

export const UserSessionSchema = z.object({
  id: z.string().uuid().or(z.string()),
  email: z.string().email(),
  name: z.string(),
  role: PortalRoleSchema,
  terminalId: z.string().optional(),
  expiresAt: z.number(),
});

export const LoginRequestSchema = z.object({
  email: z.string().min(1, "Username or email is required"),
  password: z.string().optional(),
  selectedRole: PortalRoleSchema,
  rememberTerminal: z.boolean(),
});

export const AuthSuccessResponseSchema = z.object({
  success: z.literal(true),
  redirectTo: z.string(),
  session: UserSessionSchema,
});

export const AuthFailureResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.enum([
    "INVALID_CREDENTIALS",
    "NETWORK_ERROR",
    "USER_NOT_FOUND",
    "ACCOUNT_LOCKED",
    "UNKNOWN_ERROR",
  ]),
});

export const AuthResponseSchema = z.discriminatedUnion("success", [
  AuthSuccessResponseSchema,
  AuthFailureResponseSchema,
]);

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
