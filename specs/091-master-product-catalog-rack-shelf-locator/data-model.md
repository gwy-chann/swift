# Data Model & Storage Schema: Master Product Catalog & Physical Rack/Shelf Locator

**Feature**: `specs/091-master-product-catalog-rack-shelf-locator`  
**Jira Issue**: [SIAA-91](https://the-three-devsketeers.atlassian.net/browse/SIAA-91)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Implementation  

---

## 1. Database Schema (`public.products`)

```sql
-- Migration: 20261025000000_product_rack_shelf_locator.sql
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS rack_id TEXT,
    ADD COLUMN IF NOT EXISTS shelf_id TEXT,
    ADD COLUMN IF NOT EXISTS bin_locator TEXT;

COMMENT ON COLUMN public.products.rack_id IS 'Physical storage rack identifier (e.g. A-01, TIRE-02)';
COMMENT ON COLUMN public.products.shelf_id IS 'Physical shelf level identifier within the rack (e.g. 03, FLOOR)';
COMMENT ON COLUMN public.products.bin_locator IS 'Fine-grained bin or slot locator within shelf (e.g. BIN-B4)';

CREATE INDEX IF NOT EXISTS idx_products_rack_shelf ON public.products(rack_id, shelf_id);
```

### Full Column Definition Reference:

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique entity identifier |
| `sku` | `TEXT` | `NOT NULL UNIQUE` | Master Stock Keeping Unit |
| `name` | `TEXT` | `NOT NULL` | Descriptive product name |
| `category` | `TEXT` | `NOT NULL` | Subsystem category (e.g. Oils, Brakes, Tires) |
| `brand` | `TEXT` | `NOT NULL` | Manufacturer / brand |
| `model` | `TEXT` | `NOT NULL DEFAULT 'Universal'` | Vehicle model specification |
| `cost` | `NUMERIC(10,2)` | `NOT NULL CHECK (cost >= 0)` | Inbound purchase cost |
| `wholesale` | `NUMERIC(10,2)` | `NOT NULL CHECK (wholesale >= 0)` | Bulk tier price (cost + 18%) |
| `retail` | `NUMERIC(10,2)` | `NOT NULL CHECK (retail >= 0)` | SRP tier price (cost + 35% OEM / 40% aftermarket) |
| `stock` | `INTEGER` | `NOT NULL DEFAULT 0 CHECK (stock >= 0)` | Current on-hand stock count |
| `min_threshold` | `INTEGER` | `NOT NULL DEFAULT 0 CHECK (min_threshold >= 0)` | Low stock reorder threshold |
| `rack_id` | `TEXT` | `NULL` | Physical rack tag (e.g. "A-01") |
| `shelf_id` | `TEXT` | `NULL` | Physical shelf tag (e.g. "03") |
| `bin_locator` | `TEXT` | `NULL` | Fine bin tag (e.g. "BIN-1") |
| `location` | `TEXT` | `NULL` | Standardized composite locator string ("Rack A-01 / Shelf 03") |
| `oem` | `BOOLEAN` | `NOT NULL DEFAULT false` | True if OEM part, false if aftermarket |
| `image_url` | `TEXT` | `NULL` | Product photo URL |
| `description` | `TEXT` | `NULL` | Extended part specifications |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last update timestamp |

---

## 2. Java Domain Models & Records

### 2.1 Entity: `Product.java`
```java
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String brand;

    @Column(nullable = false)
    private String model = "Universal";

    @Column(nullable = false)
    private BigDecimal cost = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal wholesale = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal retail = BigDecimal.ZERO;

    @Column(nullable = false)
    private Integer stock = 0;

    @Column(name = "min_threshold", nullable = false)
    private Integer minThreshold = 0;

    @Column(name = "rack_id")
    private String rackId;

    @Column(name = "shelf_id")
    private String shelfId;

    @Column(name = "bin_locator")
    private String binLocator;

    @Column
    private String location;

    @Column(nullable = false)
    private Boolean oem = false;

    @Column(name = "image_url")
    private String imageUrl;

    @Column
    private String description;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
    // Getters and setters...
}
```

### 2.2 DTOs

#### `CreateProductRequest.java`:
```java
public record CreateProductRequest(
    @NotBlank(message = "SKU is required.")
    String sku,

    @NotBlank(message = "Product name is required.")
    String name,

    @NotBlank(message = "Category is required.")
    String category,

    @NotBlank(message = "Brand is required.")
    String brand,

    String model,

    @NotNull(message = "Unit cost is required.")
    @Positive(message = "Unit cost must be greater than 0.")
    BigDecimal cost,

    BigDecimal wholesale,
    BigDecimal retail,
    Integer stock,
    Integer minThreshold,
    String rackId,
    String shelfId,
    String binLocator,
    String location,
    Boolean oem,
    String imageUrl,
    String description
) {}
```

#### `ProductResponse.java`:
```java
public record ProductResponse(
    UUID id,
    String sku,
    String name,
    String category,
    String brand,
    String model,
    BigDecimal cost,
    BigDecimal wholesale,
    BigDecimal retail,
    Integer stock,
    Integer minThreshold,
    String rackId,
    String shelfId,
    String binLocator,
    String location,
    Boolean oem,
    String imageUrl,
    String description,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
```
