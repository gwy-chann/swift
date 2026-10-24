# Data Model & Configuration Specifications: Baseline Foundation & Strangler Proxy

**Feature**: `088-modular-monolith-strangler-proxy`  
**Jira Ticket**: [SIAA-88](https://the-three-devsketeers.atlassian.net/browse/SIAA-88)  

---

## 1. Modular Monolith Architecture & Module Entities

The `swift-backend` service organizes domain models into 8 isolated functional modules:

```
src/main/java/com/swift/
├── SwiftBackendApplication.java
├── common/
│   ├── dto/
│   │   ├── ApiResponse.java
│   │   └── ErrorDetails.java
│   └── exception/
│       ├── GlobalExceptionHandler.java
│       └── ResourceNotFoundException.java
├── config/
│   ├── JpaConfig.java
│   ├── OpenApiConfig.java
│   └── SecurityConfig.java
└── modules/
    ├── auth/          # User authentication, Kiosk PIN, staff profile hydration
    ├── catalog/       # Product catalog, categories, rack/shelf locator
    ├── motomatcher/   # Motorcycle models, displacement, compatibility rules
    ├── pricing/       # Wholesale markup rules, customer discount matrix, labor rates
    ├── pos/           # Cart calculation, checkout orchestration, thermal receipts
    ├── shift/         # Digital punch clock, break manager, attendance logs
    ├── analytics/     # Executive KPIs, 7-day revenue trend, category P&L
    └── audit/         # Stock adjustments ledger, security audit trail
```

---

## 2. Shared Data Models & Configuration DTOs

### 2.1 Generic API Response Wrapper (`com.swift.common.dto.ApiResponse`)

```java
package com.swift.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
    boolean success,
    String message,
    T data,
    Instant timestamp
) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "Operation successful", data, Instant.now());
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, Instant.now());
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null, Instant.now());
    }
}
```

### 2.2 Error Details DTO (`com.swift.common.dto.ErrorDetails`)

```java
package com.swift.common.dto;

import java.time.Instant;
import java.util.List;

public record ErrorDetails(
    Instant timestamp,
    int status,
    String error,
    String message,
    String path,
    List<String> validationErrors
) {}
```

---

## 3. Database Connection Configuration (`application.yml`)

```yaml
spring:
  application:
    name: swift-backend
  threads:
    virtual:
      enabled: true
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/postgres?sslmode=prefer}
    username: ${DATABASE_USER:postgres}
    password: ${DATABASE_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver
    hikari:
      pool-name: SwiftHikariCP
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 20000
      max-lifetime: 1200000
      leak-detection-threshold: 60000
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: false
        jdbc:
          batch_size: 25
          order_inserts: true
          order_updates: true

server:
  port: 8080
  compression:
    enabled: true
    mime-types: application/json,text/plain,text/csv

management:
  endpoints:
    web:
      exposure:
        include: health,metrics,info
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true
```

---

## 4. NGINX Strangler Gateway Configuration Entity Model

```nginx
# Upstream definitions
upstream nextjs_backend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=10s;
}

upstream springboot_backend {
    server 127.0.0.1:8080 max_fails=2 fail_timeout=5s;
}

# Routing logic
# 1. /actuator/ -> springboot_backend
# 2. /api/v1/motomatcher/ -> springboot_backend with @fallback_to_nextjs
# 3. / -> nextjs_backend
```
