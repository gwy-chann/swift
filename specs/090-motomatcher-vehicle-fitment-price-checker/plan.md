# Technical Implementation Plan: MotoMatcher Vehicle Fitment & Product Price Checker

**Feature**: `specs/090-motomatcher-vehicle-fitment-price-checker`  
**Jira Issue**: [SIAA-90](https://the-three-devsketeers.atlassian.net/browse/SIAA-90)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Implementation  

---

## 1. Architectural Overview & Component Structure

```
swift-backend/src/main/java/com/swift/
├── config/
│   ├── CacheConfig.java                        <-- Caffeine CacheManager configuration
│   ├── JpaConfig.java
│   ├── OpenApiConfig.java
│   └── SecurityConfig.java                     <-- Permit /api/v1/motomatcher/**, /api/v1/inventory/**
└── modules/
    ├── catalog/
    │   ├── controller/
    │   │   └── ProductPriceCheckController.java <-- GET /api/v1/inventory/pricecheck
    │   ├── dto/
    │   │   ├── ProductPriceCheckItemDto.java
    │   │   └── ProductPriceCheckResponse.java
    │   ├── model/
    │   │   └── Product.java                    <-- public.products JPA entity
    │   ├── repository/
    │   │   └── ProductRepository.java          <-- findBySkuIgnoreCase, findFirstByNameContainingIgnoreCase
    │   └── service/
    │       ├── ProductPriceCheckService.java
    │       └── impl/
    │           └── ProductPriceCheckServiceImpl.java
    └── motomatcher/
        ├── controller/
        │   └── MotoMatcherController.java      <-- GET /models, GET /matrix, POST /rules
        ├── dto/
        │   ├── AddFitmentRuleRequest.java
        │   ├── AddFitmentRuleResponse.java
        │   ├── MotorcycleModelDto.java
        │   ├── MotoMatcherMatrixDto.java
        │   └── MotoMatcherMatrixPartDto.java
        ├── model/
        │   ├── MotorcycleModel.java            <-- public.motorcycle_models JPA entity
        │   └── ProductFitment.java             <-- public.product_fitments JPA entity
        ├── repository/
        │   ├── MotorcycleModelRepository.java  <-- findAllByOrderByMakeAscModelAsc
        │   └── ProductFitmentRepository.java
        └── service/
            ├── MotoMatcherService.java
            └── impl/
                └── MotoMatcherServiceImpl.java <-- JdbcTemplate RPC execution + Caffeine cache
```

---

## 2. Sequence Diagrams

### 2.1 Stored Procedure Execution Sequence (`/api/v1/motomatcher/matrix`)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Counter Clerk / Mechanic
    participant Gateway as NGINX Reverse Proxy
    participant Controller as MotoMatcherController
    participant Service as MotoMatcherServiceImpl
    participant Jdbc as JdbcTemplate
    participant DB as PostgreSQL (public.get_moto_matcher_matrix)

    Staff->>Gateway: GET /api/v1/motomatcher/matrix?modelId=UUID&category=Brakes
    Gateway->>Controller: Forward to Spring Boot :8080
    Controller->>Service: getFitmentMatrix(modelId, category, search)
    Service->>Jdbc: queryForObject("SELECT public.get_moto_matcher_matrix(?::uuid, ?, ?)::text", ...)
    Jdbc->>DB: Execute public.get_moto_matcher_matrix
    DB-->>Jdbc: Return JSONB string
    Jdbc-->>Service: String json
    Service->>Service: Deserialize via Jackson ObjectMapper
    Service-->>Controller: MotoMatcherMatrixDto
    Controller-->>Staff: HTTP 200 OK (Partitioned OEM & Aftermarket)
```

---

### 2.2 Caffeine Cache Hit Sequence (`/api/v1/motomatcher/models`)

```mermaid
sequenceDiagram
    autonumber
    actor Terminal as Kiosk / Staff Terminal
    participant Controller as MotoMatcherController
    participant Cache as Caffeine Cache ("motorcycleModels")
    participant Service as MotoMatcherServiceImpl
    participant Repo as MotorcycleModelRepository

    Terminal->>Controller: GET /api/v1/motomatcher/models
    Controller->>Cache: Check key "all"
    alt Cache Hit (<10ms)
        Cache-->>Controller: Return cached List<MotorcycleModelDto>
    else Cache Miss
        Controller->>Service: getMotorcycleModels()
        Service->>Repo: findAllByOrderByMakeAscModelAsc()
        Repo-->>Service: List<MotorcycleModel>
        Service-->>Cache: Store List<MotorcycleModelDto>
        Service-->>Controller: Return List<MotorcycleModelDto>
    end
    Controller-->>Terminal: HTTP 200 OK
```

---

### 2.3 Realtime SKU & Barcode Price Check with Margin Engine

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Cashier Barcode Scanner
    participant Controller as ProductPriceCheckController
    participant Service as ProductPriceCheckServiceImpl
    participant Repo as ProductRepository

    Cashier->>Controller: GET /api/v1/inventory/pricecheck?query=YAM-NMAX-BL01
    Controller->>Service: checkProductPrice("YAM-NMAX-BL01")
    Service->>Repo: findBySkuIgnoreCase("YAM-NMAX-BL01")
    alt Product Found
        Service->>Service: Compute markup %, wholesale markup %, scPwdPrice (retail * 0.8)
        Service-->>Controller: ProductPriceCheckResponse.ok(dto)
        Controller-->>Cashier: HTTP 200 OK (Product Price & Shelf Location)
    else Product Not Found
        Service->>Repo: findFirstByNameContainingIgnoreCase("YAM-NMAX-BL01")
        alt Matched by partial name
            Service->>Service: Compute markups & scPwdPrice
            Service-->>Controller: ProductPriceCheckResponse.ok(dto)
            Controller-->>Cashier: HTTP 200 OK
        else Still Not Found
            Service-->>Controller: ProductPriceCheckResponse.notFound(...)
            Controller-->>Cashier: HTTP 404 Not Found
        end
    end
```

---

## 3. Security & Route Configuration

Update `SecurityConfig.java` to configure authorization rules:
- `GET /api/v1/motomatcher/**`: `.permitAll()` (Read-only catalog for touch terminals and shop floor displays).
- `POST /api/v1/motomatcher/rules`: `.hasAnyRole("STAFF", "ADMIN")` or authenticated.
- `GET /api/v1/inventory/pricecheck`: `.permitAll()` (Public/terminal barcode price checker).
