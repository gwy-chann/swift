import { z } from "zod";

/**
 * Gateway Routing Contract
 * Validates NGINX Strangler Proxy Routing headers and behavior.
 */

export const GatewayHeadersSchema = z.object({
  "x-swift-backend": z.enum(["springboot", "nextjs"]).optional(),
  "x-swift-fallback": z.enum(["true", "false"]).optional(),
  "x-forwarded-for": z.string().optional(),
  "x-forwarded-proto": z.string().optional(),
});

export type GatewayHeaders = z.infer<typeof GatewayHeadersSchema>;

export interface GatewayRouteDefinition {
  pathPrefix: string;
  primaryUpstream: "springboot_backend" | "nextjs_backend";
  fallbackUpstream?: "nextjs_backend";
  fallbackTimeoutSeconds: number;
  triggerStatusCodes: number[];
}

export const STRANGLER_GATEWAY_ROUTES: GatewayRouteDefinition[] = [
  {
    pathPrefix: "/actuator/",
    primaryUpstream: "springboot_backend",
    fallbackTimeoutSeconds: 5,
    triggerStatusCodes: [502, 503, 504],
  },
  {
    pathPrefix: "/api/v1/motomatcher/",
    primaryUpstream: "springboot_backend",
    fallbackUpstream: "nextjs_backend",
    fallbackTimeoutSeconds: 5,
    triggerStatusCodes: [502, 503, 504],
  },
  {
    pathPrefix: "/",
    primaryUpstream: "nextjs_backend",
    fallbackTimeoutSeconds: 10,
    triggerStatusCodes: [],
  },
];
