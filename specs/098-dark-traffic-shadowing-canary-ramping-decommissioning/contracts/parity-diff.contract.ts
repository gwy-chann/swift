/**
 * Parity Diff Engine & Contract Validation Schemas
 * SIAA-98: Dark Traffic Shadowing & Backend Decommissioning
 */

import { z } from 'zod';

export const ParityMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type ParityMethod = z.infer<typeof ParityMethodSchema>;

export const ParityStatusSchema = z.enum(['PASS', 'FAIL', 'SKIPPED']);
export type ParityStatus = z.infer<typeof ParityStatusSchema>;

export const FieldMismatchSchema = z.object({
  path: z.string(),
  expected: z.unknown(),
  actual: z.unknown(),
  severity: z.enum(['CRITICAL', 'WARNING', 'IGNORED']),
  ruleApplied: z.string().optional(),
});
export type FieldMismatch = z.infer<typeof FieldMismatchSchema>;

export const EndpointParityResultSchema = z.object({
  endpoint: z.string(),
  method: ParityMethodSchema,
  status: ParityStatusSchema,
  springBootStatusCode: z.number().int(),
  nextJsStatusCode: z.number().int(),
  durationMs: z.object({
    springBoot: z.number().nonnegative(),
    nextJs: z.number().nonnegative(),
    deltaMs: z.number(),
  }),
  mismatches: z.array(FieldMismatchSchema),
});
export type EndpointParityResult = z.infer<typeof EndpointParityResultSchema>;

export const ParityDiffReportSchema = z.object({
  timestamp: z.string(),
  totalEndpointsChecked: z.number().int().nonnegative(),
  passedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  overallParityPercentage: z.number().min(0).max(100),
  results: z.array(EndpointParityResultSchema),
});
export type ParityDiffReport = z.infer<typeof ParityDiffReportSchema>;
