# Data Model & Storage Schema: SIAA-57

**Feature**: Supabase Global Markup Rules Schema, Realtime Sync & Price Revalidation Engine  
**Ticket**: [SIAA-57](https://the-three-devsketeers.atlassian.net/browse/SIAA-57) (STORY-7.7)  

---

## 1. Relational Entities (PostgreSQL / Supabase)

### Table: `public.pricing_rules` (Singleton)

Enforces exactly one active global pricing configuration record in the entire database.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PRIMARY KEY CHECK (id = 1) DEFAULT 1` | Singleton identifier strictly bound to row 1 |
| `retail_markup` | `NUMERIC(5, 2)` | `NOT NULL CHECK (retail_markup > 0 AND retail_markup <= 200)` | Standard OEM retail markup percentage (e.g. 35.00) |
| `wholesale_markup` | `NUMERIC(5, 2)` | `NOT NULL CHECK (wholesale_markup > 0 AND wholesale_markup <= 200)` | Wholesale / reseller markup percentage (e.g. 18.00) |
| `aftermarket_markup` | `NUMERIC(5, 2)` | `NOT NULL CHECK (aftermarket_markup > 0 AND aftermarket_markup <= 200)` | Racing & performance aftermarket markup (e.g. 40.00) |
| `hourly_labor_rate` | `NUMERIC(10, 2)`| `NOT NULL CHECK (hourly_labor_rate >= 0)` | Shop benchmark hourly labor rate in PHP (e.g. 450.00) |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT timezone('utc'::text, now())` | Last modified timestamp |
| `updated_by` | `UUID` | `REFERENCES auth.users(id) ON DELETE SET NULL` | Administrator UID who initiated update |

---

### Table: `public.pricing_rules_audit_logs` (Immutable)

Historical audit log ledger recording every pricing rule adjustment.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique log entry identifier |
| `changed_by` | `UUID` | `REFERENCES auth.users(id) ON DELETE SET NULL` | Admin who made the change |
| `user_name` | `TEXT` | `DEFAULT 'Admin'` | Human-readable user display name |
| `old_retail_markup` | `NUMERIC(5, 2)` | `NOT NULL` | Previous retail markup |
| `new_retail_markup` | `NUMERIC(5, 2)` | `NOT NULL` | New retail markup |
| `old_wholesale_markup` | `NUMERIC(5, 2)`| `NOT NULL` | Previous wholesale markup |
| `new_wholesale_markup` | `NUMERIC(5, 2)`| `NOT NULL` | New wholesale markup |
| `old_aftermarket_markup` | `NUMERIC(5, 2)`| `NOT NULL` | Previous aftermarket markup |
| `new_aftermarket_markup` | `NUMERIC(5, 2)`| `NOT NULL` | New aftermarket markup |
| `old_hourly_labor_rate` | `NUMERIC(10, 2)`| `NOT NULL` | Previous benchmark hourly rate |
| `new_hourly_labor_rate` | `NUMERIC(10, 2)`| `NOT NULL` | New benchmark hourly rate |
| `reason` | `TEXT` | `DEFAULT ''` | Optional change notes / rationale |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT timezone('utc'::text, now())` | Timestamp of modification |

---

## 2. TypeScript Domain Models & DTOs

```ts
export interface PricingRules {
  id?: number;
  retailMarkup: number;      // 0 < markup <= 200 (%)
  wholesaleMarkup: number;   // 0 < markup <= 200 (%)
  aftermarketMarkup: number; // 0 < markup <= 200 (%)
  hourlyLaborRate: number;   // >= 0 (PHP)
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface PricingRulesRow {
  id: number;
  retail_markup: number;
  wholesale_markup: number;
  aftermarket_markup: number;
  hourly_labor_rate: number;
  updated_at: string;
  updated_by: string | null;
}

export interface PricingRulesAuditLog {
  id: string;
  changed_by: string | null;
  user_name: string;
  old_retail_markup: number;
  new_retail_markup: number;
  old_wholesale_markup: number;
  new_wholesale_markup: number;
  old_aftermarket_markup: number;
  new_aftermarket_markup: number;
  old_hourly_labor_rate: number;
  new_hourly_labor_rate: number;
  reason?: string;
  created_at: string;
}
```
