/**
 * Type-Safe Validation Contracts & Schemas: Secure Master Admin Elevation Modal
 * Feature: SIAA-32 (STORY-5.5)
 */

import { z } from "zod";

/**
 * Validation schema for admin elevation form submission.
 */
export const AdminElevationInputSchema = z.object({
  password: z
    .string()
    .trim()
    .min(1, "Please enter the administrator password."),
  targetPortal: z.enum(["admin", "staff"]).default("admin"),
  terminalId: z.string().optional().default("Terminal #01"),
});

export type AdminElevationInput = z.infer<typeof AdminElevationInputSchema>;

/**
 * Validation schema for the elevation action response.
 */
export const AdminElevationResultSchema = z.object({
  success: z.boolean(),
  elevatedUntil: z.number().optional(),
  code: z
    .enum(["INVALID_PASSWORD", "EMPTY_PASSWORD", "UNAUTHORIZED", "SERVER_ERROR", "INVALID_PIN"])
    .optional(),
  error: z.string().optional(),
});

export type AdminElevationResult = z.infer<typeof AdminElevationResultSchema>;

/**
 * Forensic Security Audit Log Event Schema for Elevation Attempts.
 */
export const ElevationAuditEventSchema = z.object({
  action: z.enum(["MASTER_ADMIN_ELEVATION", "ELEVATION_FAILED"]),
  user: z.string().default("Elevated Staff Terminal"),
  timestamp: z.string().datetime().or(z.string()),
  ip: z.string().default("Terminal #01 (Shop Floor)"),
  severity: z.enum(["info", "warning", "security_alert"]).default("info"),
});

export type ElevationAuditEvent = z.infer<typeof ElevationAuditEventSchema>;
