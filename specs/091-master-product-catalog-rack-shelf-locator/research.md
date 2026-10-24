# Research & Architecture Decisions: Master Product Catalog & Physical Rack/Shelf Locator

**Feature**: `specs/091-master-product-catalog-rack-shelf-locator`  
**Jira Issue**: [SIAA-91](https://the-three-devsketeers.atlassian.net/browse/SIAA-91)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Approved Architecture  

---

## 1. Technical Context & Stack Constraints

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Runtime & Framework** | Java 21 + Spring Boot 3.3.4 | Project standard modular monolith runtime with Virtual Threads enabled. |
| **Data Validation** | Jakarta Bean Validation 3.0 (`jakarta.validation-api` + `hibernate-validator`) | Declarative payload constraint validation (`@NotBlank`, `@Positive`, `@Min`) returning structured 400 Bad Request responses. |
| **Persistence Layer** | Spring Data JPA (`JpaRepository<Product, UUID>`) | Object-relational mapping with PostgreSQL B-Tree indexed queries and automatic audit timestamp management. |
| **Mathematical Parity** | `BigDecimal` with `RoundingMode.HALF_UP` | Zero floating-point drift for monetary and markup calculations matching Next.js `calculateMarkupPrices`. |
| **Reverse Proxy** | NGINX Strangler Gateway (`/api/v1/admin/products`) | Strangler Fig architectural migration delegating product catalog admin requests directly to Spring Boot with Next.js fallback. |

---

## 2. Architecture Decisions & Tradeoff Analysis

### Decision 1: Pricing Calculation Engine (`PricingCalculatorService`)
- **Context**: In SWIFT, wholesale and retail prices can either be explicitly set by store management or calculated automatically from base cost via standardized markup rules:
  - Wholesale default: `+18%`
  - OEM Retail default: `+35%`
  - Aftermarket Retail default: `+40%`
- **Alternatives Considered**:
  1. *Calculate markup in frontend UI before sending request*: Fragile; prone to client manipulation or bypassing validation.
  2. *Calculate markup via database trigger*: Couples business pricing logic into DB triggers, harder to test and mock.
  3. *Dedicated Spring Service (`PricingCalculatorService`)*: Clean separation of concerns, unit testable, handles explicit override vs default fallback.
- **Selected**: **Alternative 3 (`PricingCalculatorService`)**.
  - `computeWholesalePrice(BigDecimal cost, BigDecimal explicitWholesale)`
  - `computeRetailPrice(BigDecimal cost, boolean isOem, BigDecimal explicitRetail)`
  - Uses `cost.multiply(BigDecimal.ONE.add(markupRate)).setScale(2, RoundingMode.HALF_UP)`.

---

### Decision 2: Physical Location Coordinates (`rack_id`, `shelf_id`, `bin_locator`) and `location`
- **Context**: Floor mechanics need quick physical retrieval (<5 seconds). Legacy products use a single `location` text column (e.g., `"Rack A-01 / Shelf 03"`). SIAA-91 checklist item 4 specifies integrating physical location attributes (`rack_id`, `shelf_id`, `bin_locator`).
- **Design Strategy**:
  - Add optional columns `rack_id`, `shelf_id`, `bin_locator` to `public.products` via database migration `20261025000000_product_rack_shelf_locator.sql`.
  - In `Product.java` entity, map `@Column(name = "rack_id") private String rackId`, `@Column(name = "shelf_id") private String shelfId`, and `@Column(name = "bin_locator") private String binLocator`.
  - Automatically compose backward-compatible `location`:
    - If `rackId` and `shelfId` are provided: `"Rack " + rackId + " / Shelf " + shelfId`
    - Else if `binLocator` is provided: `binLocator`
    - Else fallback to provided `location` string or `null`.

---

### Decision 3: Case-Insensitive Duplicate SKU Conflict Enforcement
- **Context**: SKUs like `"ENG-OIL-10W40"` and `"eng-oil-10w40"` must not collide.
- **Handling Strategy**:
  - `ProductRepository.findBySkuIgnoreCase(request.sku().trim())`.
  - If a product is found, throw a custom exception `DuplicateSkuException(sku)` caught by `@ExceptionHandler` or handled in controller returning `HTTP 409 Conflict`:
    ```json
    {
      "success": false,
      "code": "SKU_ALREADY_EXISTS",
      "error": "Product with SKU \"ENG-OIL-10W40\" already exists in the catalog."
    }
    ```

---

### Decision 4: Contract Envelope Format
- Successful response returns HTTP 201 Created with saved `ProductDto`:
  ```json
  {
    "id": "uuid",
    "sku": "ENG-OIL-10W40",
    "name": "Engine Oil 10W40",
    "category": "Oils",
    "brand": "Yamalube",
    "model": "Universal",
    "cost": 250.00,
    "wholesale": 295.00,
    "retail": 337.50,
    "stock": 0,
    "minThreshold": 5,
    "rackId": "A-01",
    "shelfId": "03",
    "binLocator": null,
    "location": "Rack A-01 / Shelf 03",
    "oem": true
  }
  ```
- Product list endpoint `GET /api/v1/admin/products` returns HTTP 200 with an array or page envelope of `ProductDto` objects matching Next.js `Product` domain type.
