import { z } from "zod";

/**
 * Spring Boot Application Configuration Contract
 */

export const HikariPoolConfigSchema = z.object({
  maximumPoolSize: z.number().int().min(5).max(100).default(20),
  minimumIdle: z.number().int().min(1).max(20).default(5),
  idleTimeout: z.number().int().min(10000).default(300000),
  connectionTimeout: z.number().int().min(5000).default(20000),
  maxLifetime: z.number().int().min(60000).default(1200000),
});

export const HibernateConfigSchema = z.object({
  ddlAuto: z.literal("validate"),
  dialect: z.string().default("org.hibernate.dialect.PostgreSQLDialect"),
});

export const SpringBackendConfigSchema = z.object({
  serverPort: z.number().int().default(8080),
  virtualThreadsEnabled: z.boolean().default(true),
  hikari: HikariPoolConfigSchema,
  hibernate: HibernateConfigSchema,
});

export type SpringBackendConfig = z.infer<typeof SpringBackendConfigSchema>;
