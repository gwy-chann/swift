import { z } from "zod";

export const LogoutResponseSchema = z.object({
  success: z.literal(true),
  redirectTo: z.string(),
});

export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
