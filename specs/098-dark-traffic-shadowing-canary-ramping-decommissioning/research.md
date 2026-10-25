# Research & Architectural Analysis: Dark Traffic Shadowing, Canary Traffic Ramping & Next.js Backend Decommissioning

**Feature**: `098-dark-traffic-shadowing-canary-ramping-decommissioning`  
**Jira Issue**: [SIAA-98](https://the-three-devsketeers.atlassian.net/browse/SIAA-98)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 6 (Shadow Parity & Cutover)

---

## 1. Technical Landscape & Architecture Patterns

### 1.1 Asynchronous Dark Traffic Mirroring (NGINX `mirror`)

To validate Spring Boot against live production requests before shifting real user traffic, the **Strangler Fig Gateway** employs NGINX's native `ngx_http_mirror_module`:

```nginx
location /api/v1/ {
    # 1. Asynchronously clone read traffic to shadow upstream
    mirror /shadow-traffic;
    mirror_request_body off;

    # 2. Forward original request to active primary upstream
    proxy_pass http://active_upstream;
}

location = /shadow-traffic {
    internal;
    proxy_pass http://springboot_backend$request_uri;
    proxy_pass_request_body off;
    proxy_set_header X-Swift-Shadow "true";
    proxy_ignore_client_abort on;
    proxy_intercept_errors off;
}
```

#### Key Characteristics & Latency Guarantees
1. **Asynchronous Non-Blocking Execution**: NGINX forks an internal subrequest for `/shadow-traffic`. The client's response is streamed back immediately as soon as `active_upstream` replies. Client TTFB (time to first byte) experiences **0ms added latency**.
2. **Safe Read Isolation**: Mirroring is applied strictly to idempotent read requests (`GET`, `HEAD`). Write operations (`POST`, `PUT`, `DELETE`) are excluded from dark shadowing to prevent phantom side-effects (e.g. duplicate inventory decrements, double clock-ins).
3. **Resilience to Shadow Failures**: If Spring Boot throws an exception, times out, or fails during shadowed requests, the error is discarded by NGINX without impacting the primary client connection.

---

### 1.2 Canary Traffic Ramping Architecture

Canary deployment progressively shifts traffic from the legacy Next.js backend to Spring Boot in five graduated stages:
- **Stage 1 (10%)**: Initial canary validation under live user concurrency.
- **Stage 2 (25%)**: Quarter traffic shift to test cache hit ratios and connection pool sizing.
- **Stage 3 (50%)**: Half traffic load to verify virtual thread scheduling and database locking.
- **Stage 4 (80%)**: Majority traffic shift.
- **Stage 5 (100%)**: Complete cutover to Spring Boot with Next.js remaining purely as emergency fallback.

#### Traffic Shifting Mechanism
NGINX supports two complementary shifting strategies:
1. **Upstream Server Weights**:
   ```nginx
   upstream dynamic_canary_pool {
       server swift-backend:8080 weight=25 max_fails=2 fail_timeout=5s;
       server host.docker.internal:3000 weight=75 max_fails=3 fail_timeout=10s;
   }
   ```
2. **Deterministic Client Partitioning via `split_clients`**:
   ```nginx
   split_clients "${remote_addr}${http_user_agent}" $canary_upstream {
       25%     springboot_backend;
       *       nextjs_backend;
   }
   ```
3. **SRE Header / Cookie Override**:
   Allows internal testers and automated synthetic monitors to force Spring Boot or Next.js routing by sending `X-Swift-Route: springboot` or `X-Swift-Route: nextjs`.

---

### 1.3 Parity Diff Engine & Golden Master Verification

The Parity Diff Engine validates behavioral, schema, and data equivalence between Spring Boot and Next.js:

```
                  ┌──────────────────────────────────────────────┐
                  │          Parity Diff Assertion Suite         │
                  └───────┬──────────────────────────────┬───────┘
                          │                              │
                          ▼                              ▼
                 Spring Boot 3.3 REST API         Next.js Backend
                 (HTTP 127.0.0.1:8080)        (Golden Master Fixtures)
                          │                              │
                          └──────────────┬───────────────┘
                                         ▼
                            JSON Normalization & Masking:
                            - Mask volatile UUIDs / Nonces
                            - Normalize ISO 8601 Timestamps (±2s)
                            - Verify Cents Precision (e.g. 19.99)
                            - Compare HTTP Status Codes
                                         │
                                         ▼
                               Pass / Fail Assertion
```

#### Field Masking Rules
- **Volatile IDs**: Transient transaction session IDs, request trace IDs (`traceparent`, `X-Request-Id`).
- **Dynamic Timestamps**: `created_at`, `timestamp`, `exp`, `iat` checked for presence and ISO 8601 validity rather than byte equality.
- **Strict Equality**: Entity IDs, prices, discounts, stock quantities, SKU codes, role flags, status enums, and calculated totals must match 100%.

---

### 1.4 Prometheus / Actuator Telemetry & Automated Rollback

Spring Boot exposes production metrics via Micrometer and Actuator:
- **Dependency**: `io.micrometer:micrometer-registry-prometheus`
- **Endpoint**: `GET /actuator/prometheus`
- **Key Telemetry Metrics**:
  - `http_server_requests_seconds_count`: Total requests processed.
  - `http_server_requests_seconds_sum` / `_max`: Latency distribution.
  - `http_server_requests_seconds{status=~"5.."}`: HTTP 5xx error counter.
  - `hikaricp_connections_active` / `_idle` / `_pending`: Connection pool utilization.

#### Automated Rollback Thresholds
The gateway and SRE monitor automatically abort canary progression and trigger failover to Next.js if:
1. Spring Boot HTTP 5xx error rate exceeds **0.01%** over a 5-minute sliding window.
2. P99 latency exceeds **120ms**.
3. HikariCP connection queue wait times exceed **500ms**.

---

### 1.5 14-Day Canary Graduation & Next.js Lean Client Transition

Upon completing 14 continuous days at 100% traffic without rollbacks or SLA violations:
1. Next.js transitions permanently into a **lean client**:
   - `lib/api-client.ts` acts as the single type-safe HTTP gateway for client and server components.
   - All 46 Server Actions in `lib/**/actions.ts` are converted into lightweight delegators forwarding requests to `apiClient` with `@deprecated` JSDoc annotations and telemetry logging.
2. Legacy server-side direct database connections (Prisma PostgreSQL queries in server action files) are safely bypassed.
