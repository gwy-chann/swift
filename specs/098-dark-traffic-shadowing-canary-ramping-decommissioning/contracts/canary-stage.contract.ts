/**
 * Canary Stage Transition & Telemetry Validation Schemas
 * SIAA-98: Dark Traffic Shadowing & Backend Decommissioning
 */

import { z } from 'zod';

export const CanaryStageEnum = z.enum([
  'STAGE_10',
  'STAGE_25',
  'STAGE_50',
  'STAGE_80',
  'STAGE_100',
  'GRADUATED',
  'ROLLBACK',
]);
export type CanaryStage = z.infer<typeof CanaryStageEnum>;

export const CanaryHealthMetricsSchema = z.object({
  totalRequests: z.number().int().nonnegative(),
  errorCount5xx: z.number().int().nonnegative(),
  errorRatePercentage: z.number().min(0).max(100),
  p95LatencyMs: z.number().nonnegative(),
  p99LatencyMs: z.number().nonnegative(),
  rollbackCount: z.number().int().nonnegative(),
  activeSpringConnections: z.number().int().nonnegative(),
});
export type CanaryHealthMetrics = z.infer<typeof CanaryHealthMetricsSchema>;

export const CanaryHealthSnapshotSchema = z.object({
  evaluatedAt: z.string(),
  currentStage: CanaryStageEnum,
  consecutiveDefectFreeDays: z.number().int().nonnegative(),
  graduationTargetDays: z.number().int().default(14),
  isEligibleForGraduation: z.boolean(),
  metrics: CanaryHealthMetricsSchema,
  checks: z.object({
    noRollbacksPass: z.boolean(),
    errorRatePass: z.boolean(),
    latencyP99Pass: z.boolean(),
    durationPass: z.boolean(),
  }),
});
export type CanaryHealthSnapshot = z.infer<typeof CanaryHealthSnapshotSchema>;
