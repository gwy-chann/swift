# Data Model & Storage Schema: MotoMatcher Vehicle Fitment & Product Price Checker

**Feature**: `specs/090-motomatcher-vehicle-fitment-price-checker`  
**Jira Issue**: [SIAA-90](https://the-three-devsketeers.atlassian.net/browse/SIAA-90)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Implementation  

---

## 1. Relational Database Schema (PostgreSQL)

### 1.1 `public.motorcycle_models`
```sql
CREATE TABLE IF NOT EXISTS public.motorcycle_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    displacement_cc INTEGER NOT NULL CHECK (displacement_cc > 0),
    year_start INTEGER NOT NULL CHECK (year_start > 1900),
    year_end INTEGER NULL CHECK (year_end IS NULL OR year_end >= year_start),
    category TEXT NOT NULL,
    image_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_motorcycle_models_make_model_year UNIQUE (make, model, year_start)
);
```

### 1.2 `public.product_fitments`
```sql
CREATE TABLE IF NOT EXISTS public.product_fitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES public.motorcycle_models(id) ON DELETE CASCADE,
    fitment_type TEXT NOT NULL CHECK (fitment_type IN ('oem', 'aftermarket', 'universal')),
    year_range TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_product_fitments_product_model UNIQUE (product_id, model_id)
);
```

### 1.3 `public.products` (Relevant subset)
```sql
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'Universal',
    cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0),
    wholesale NUMERIC(10, 2) NOT NULL CHECK (wholesale >= 0),
    retail NUMERIC(10, 2) NOT NULL CHECK (retail >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_threshold INTEGER NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
    location TEXT NULL,
    oem BOOLEAN NOT NULL DEFAULT false,
    image_url TEXT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

---

## 2. PostgreSQL Stored Procedure Contract

```sql
public.get_moto_matcher_matrix(
    p_model_id UUID,
    p_category TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
) RETURNS JSONB
```

### JSONB Structure:
```json
{
  "oem_parts": [
    {
      "id": "uuid",
      "sku": "YAM-NMAX-BL01",
      "name": "Brake Lever Left (OEM)",
      "brand": "Yamaha Genuine Parts",
      "category": "Brakes",
      "retail_price": 450.00,
      "stock_level": 8,
      "min_threshold": 3,
      "shelf_location": "Rack A-01 / Shelf 2",
      "fitment_type": "oem",
      "fitment_notes": null,
      "year_range": "2020-2024",
      "is_universal": false,
      "upsell_delta_amount": null,
      "upsell_delta_percent": null,
      "upsell_badge": null,
      "oem_reference_sku": null
    }
  ],
  "aftermarket_parts": [
    {
      "id": "uuid",
      "sku": "RCB-NMAX-BL02",
      "name": "RCB S2 Series Adjustable Lever",
      "brand": "Racing Boy",
      "category": "Brakes",
      "retail_price": 580.00,
      "stock_level": 14,
      "min_threshold": 5,
      "shelf_location": "Rack A-01 / Shelf 3",
      "fitment_type": "aftermarket",
      "fitment_notes": "6-stage click adjustment",
      "year_range": "2020-2024",
      "is_universal": false,
      "upsell_delta_amount": 130.00,
      "upsell_delta_percent": 28.9,
      "upsell_badge": "+₱130.00 (+28.9%)",
      "oem_reference_sku": "YAM-NMAX-BL01"
    }
  ]
}
```

---

## 3. Spring Boot Domain Models & DTOs

### 3.1 DTOs (`com.swift.modules.motomatcher.dto`)
- `MotorcycleModelDto`:
  - `id` (UUID), `make` (String), `model` (String), `displacement_cc` (Integer), `year_start` (Integer), `year_end` (Integer), `category` (String), `image_url` (String), `created_at` (String), `updated_at` (String).
- `MotoMatcherMatrixPartDto`:
  - Mirrors exact JSON keys with `@JsonProperty("retail_price")`, `@JsonProperty("stock_level")`, etc.
- `MotoMatcherMatrixDto`:
  - `@JsonProperty("oem_parts") List<MotoMatcherMatrixPartDto> oemParts`
  - `@JsonProperty("aftermarket_parts") List<MotoMatcherMatrixPartDto> aftermarketParts`
- `AddFitmentRuleRequest`:
  - `productId` (UUID), `modelId` (UUID), `fitmentType` (String), `yearRange` (String), `notes` (String).
- `AddFitmentRuleResponse`:
  - `success` (boolean), `ruleId` (String), `error` (String).

### 3.2 DTOs (`com.swift.modules.catalog.dto`)
- `ProductPriceCheckItemDto`:
  - `id` (String), `sku` (String), `name` (String), `category` (String), `brand` (String), `model` (String), `stock` (Integer), `minThreshold` (Integer), `location` (String), `cost` (Double), `retailPrice` (Double), `wholesalePrice` (Double), `scPwdPrice` (Double), `grossMarkupPercent` (Double), `wholesaleMarkupPercent` (Double).
- `ProductPriceCheckResponse`:
  - `success` (boolean), `product` (ProductPriceCheckItemDto), `code` (String), `error` (String).
