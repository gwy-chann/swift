import { z } from "zod";

/**
 * Spring Boot Actuator Health & Metrics Contract
 */

export const HealthStatusSchema = z.enum(["UP", "DOWN", "OUT_OF_SERVICE", "UNKNOWN"]);

export const ComponentHealthSchema = z.object({
  status: HealthStatusSchema,
  details: z.record(z.string(), z.unknown()).optional(),
});

export const ActuatorHealthResponseSchema = z.object({
  status: HealthStatusSchema,
  components: z
    .object({
      db: ComponentHealthSchema.optional(),
      diskSpace: ComponentHealthSchema.optional(),
      ping: ComponentHealthSchema.optional(),
    })
    .catchall(ComponentHealthSchema)
    .optional(),
});

export type ActuatorHealthResponse = z.infer<typeof ActuatorHealthResponseSchema>;
