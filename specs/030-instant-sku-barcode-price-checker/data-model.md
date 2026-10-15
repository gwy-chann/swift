# Data Model: Instant SKU / Barcode Price Checker & Margin Simulator

**Feature**: Instant SKU / Barcode Price Checker & Margin Simulator  
**Jira Issue**: [SIAA-31](https://the-three-devsketeers.atlassian.net/browse/SIAA-31) (STORY-5.4)  
**Spec Reference**: [`specs/030-instant-sku-barcode-price-checker/spec.md`](spec.md)  

---

## 1. Domain Entities & Type Definitions

### 1.1 Product Price Check Item Model

```typescript
export interface ProductPriceCheckItem {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  brand: string;
  model?: string;
  stock: number;
  minThreshold: number;
  location: string;
  cost: number;
  retailPrice: number;
  wholesalePrice: number;
  scPwdPrice: number;
  grossMarkupPercent: number;
  wholesaleMarkupPercent: number;
}
```

### 1.2 Price Check Action Result

```typescript
export interface ProductPriceCheckResult {
  success: boolean;
  product?: ProductPriceCheckItem;
  error?: string;
  code?: 'PRODUCT_NOT_FOUND' | 'INVALID_QUERY' | 'DATABASE_ERROR';
}
```

### 1.3 Margin Simulation State Model

```typescript
export interface MarginSimulationParams {
  baseCost: number;
  simulatedRetailPrice: number;
  simulatedWholesalePrice?: number;
}

export interface MarginSimulationOutput {
  simulatedRetailPrice: number;
  simulatedGrossProfit: number;
  simulatedGrossMarkupPercent: number;
  simulatedGrossMarginPercent: number;
  isProfitable: boolean;
  isBelowCost: boolean;
}
```

### 1.4 High-Velocity Reference Schedule Row

```typescript
export interface PriceScheduleRow {
  sku: string;
  name: string;
  category: string;
  wholesalePrice: number;
  retailPrice: number;
  cost: number;
  grossMarkupPercent: number;
  location: string;
}
```

---

## 2. Business Logic Calculations

### 2.1 Gross Markup Percentage Formula
```typescript
export function computeGrossMarkupPercent(retail: number, cost: number): number {
  if (cost <= 0) return 0;
  return Number((((retail - cost) / cost) * 100).toFixed(1));
}
```

### 2.2 Gross Margin Percentage Formula
```typescript
export function computeGrossMarginPercent(retail: number, cost: number): number {
  if (retail <= 0) return 0;
  return Number((((retail - cost) / retail) * 100).toFixed(1));
}
```

### 2.3 SC / PWD Mandated Discount
```typescript
export function computeScPwdPrice(retail: number): number {
  return Number((retail * 0.8).toFixed(2));
}
```

---

## 3. Storage & Database Schema Parity

The lookup leverages the existing `products` table in Supabase PostgreSQL:

```sql
-- Existing public.products table
SELECT 
  id,
  sku,
  barcode,
  name,
  category,
  brand,
  model,
  stock,
  min_threshold,
  location,
  cost,
  retail,
  wholesale
FROM products
WHERE sku ILIKE :query OR barcode = :query OR name ILIKE '%' || :query || '%';
```

If Supabase is offline or in development mock mode, the fallback data source is `MOCK_PRODUCTS` (`lib/mock-data/products.ts`), which already contains full `cost`, `wholesale`, `retail`, and `location` definitions.
