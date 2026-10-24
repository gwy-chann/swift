import { z } from "zod";

export const ElevationRequestSchema = z.object({
  pinOrPassword: z.string().min(1, "Password or PIN is required"),
});

export const ElevationSuccessResponseSchema = z.object({
  success: z.literal(true),
  elevated: z.literal(true),
  expiresAt: z.number(),
});

export const ElevationFailureResponseSchema = z.object({
  success: z.literal(false),
  elevated: z.literal(false),
  error: z.string(),
  code: z.enum(["INVALID_PIN", "EMPTY_PASSWORD", "UNAUTHORIZED"]),
});

export const ElevationResponseSchema = z.discriminatedUnion("success", [
  ElevationSuccessResponseSchema,
  ElevationFailureResponseSchema,
]);

export type ElevationRequest = z.infer<typeof ElevationRequestSchema>;
export type ElevationResponse = z.infer<typeof ElevationResponseSchema>;
