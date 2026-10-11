# Data Model: Supabase POS Transactions & Hybrid Line Items

**Feature Branch**: `feat/SIAA-50-pos-transactions-hybrid-line-items`  
**Jira Issue**: [SIAA-50](https://the-three-devsketeers.atlassian.net/browse/SIAA-50)  

---

## 1. Database Entity: `public.transactions`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique transaction UUID |
| `receipt_number` | `TEXT` | `NOT NULL UNIQUE` | Thermal receipt / human identifier (e.g. `TX-1041`) |
| `cashier_id` | `UUID` | `NULL REFERENCES auth.users(id) ON DELETE SET NULL` | Auth UUID of cashier |
| `cashier_name` | `TEXT` | `NOT NULL` | Cashier name snapshot (e.g. `Mike Morales`) |
| `pricing_mode` | `TEXT` | `NOT NULL CHECK (pricing_mode IN ('retail', 'wholesale'))` | Cart pricing mode applied |
| `subtotal` | `NUMERIC(10, 2)` | `NOT NULL CHECK (subtotal >= 0)` | Gross subtotal before discount |
| `discount_type` | `TEXT` | `NULL CHECK (discount_type IN ('none', 'senior', 'pwd', 'vip'))` | Discount category applied |
| `discount_rate` | `NUMERIC(5, 4)` | `NOT NULL DEFAULT 0.0000 CHECK (discount_rate >= 0)` | Discount rate (e.g. 0.20 for 20%) |
| `discount_amount` | `NUMERIC(10, 2)` | `NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0)` | Deducted discount amount |
| `total_due` | `NUMERIC(10, 2)` | `NOT NULL CHECK (total_due >= 0)` | Final net payable amount |
| `cash_tendered` | `NUMERIC(10, 2)` | `NOT NULL CHECK (cash_tendered >= total_due)` | Amount handed by customer |
| `change_due` | `NUMERIC(10, 2)` | `NOT NULL DEFAULT 0.00 CHECK (change_due >= 0)` | Balance returned to customer |
| `payment_method` | `TEXT` | `NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'GCash', 'Card', 'Maya'))` | Payment method |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT timezone('utc'::text, now())` | Creation date and timestamp |

---

## 2. Database Entity: `public.transaction_items`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Line item UUID |
| `transaction_id` | `UUID` | `NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT` | Foreign key to parent transaction |
| `item_type` | `TEXT` | `NOT NULL CHECK (item_type IN ('part', 'service'))` | Hybrid item discriminator |
| `item_sku_or_code` | `TEXT` | `NOT NULL` | Product SKU or Labor Service code |
| `item_name` | `TEXT` | `NOT NULL` | Item description / name snapshot |
| `unit_price` | `NUMERIC(10, 2)` | `NOT NULL CHECK (unit_price >= 0)` | Unit selling price charged |
| `quantity` | `INT` | `NOT NULL CHECK (quantity > 0)` | Billed quantity |
| `subtotal` | `NUMERIC(10, 2)` | `NOT NULL CHECK (subtotal >= 0)` | Line subtotal (`unit_price * quantity`) |
| `bay` | `TEXT` | `NULL` | Workshop bay snapshot if service |
| `shelf_location` | `TEXT` | `NULL` | Physical shelf location snapshot if part |

---

## 3. Prisma Models: `Transaction` & `TransactionItem`

```prisma
model Transaction {
  id             String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  receiptNumber  String            @unique @map("receipt_number")
  cashierId      String?           @map("cashier_id") @db.Uuid
  cashierName    String            @map("cashier_name")
  pricingMode    String            @map("pricing_mode")
  subtotal       Decimal           @db.Decimal(10, 2)
  discountType   String?           @map("discount_type")
  discountRate   Decimal           @default(0.0000) @map("discount_rate") @db.Decimal(5, 4)
  discountAmount Decimal           @default(0.00) @map("discount_amount") @db.Decimal(10, 2)
  totalDue       Decimal           @map("total_due") @db.Decimal(10, 2)
  cashTendered   Decimal           @map("cash_tendered") @db.Decimal(10, 2)
  changeDue      Decimal           @default(0.00) @map("change_due") @db.Decimal(10, 2)
  paymentMethod  String            @default("Cash") @map("payment_method")
  createdAt      DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)

  items          TransactionItem[]

  @@index([receiptNumber])
  @@index([createdAt])
  @@index([cashierId])
  @@index([pricingMode])
  @@index([paymentMethod])
  @@map("transactions")
}

model TransactionItem {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  transactionId   String      @map("transaction_id") @db.Uuid
  itemType        String      @map("item_type")
  itemSkuOrCode   String      @map("item_sku_or_code")
  itemName        String      @map("item_name")
  unitPrice       Decimal     @map("unit_price") @db.Decimal(10, 2)
  quantity        Int
  subtotal        Decimal     @db.Decimal(10, 2)
  bay             String?
  shelfLocation   String?     @map("shelf_location")

  transaction     Transaction @relation(fields: [transactionId], references: [id], onDelete: Restrict)

  @@index([transactionId])
  @@index([itemType])
  @@index([itemSkuOrCode])
  @@map("transaction_items")
}
```

---

## 4. TypeScript Domain Interfaces (`lib/types/transaction.ts`)

```typescript
export type PricingMode = 'retail' | 'wholesale';
export type TransactionPaymentMethod = 'Cash' | 'GCash' | 'Card' | 'Maya';
export type TransactionDiscountType = 'none' | 'senior' | 'pwd' | 'vip';
export type TransactionItemType = 'part' | 'service';

export interface DbTransactionItem {
  id?: string;
  transaction_id?: string;
  item_type: TransactionItemType;
  item_sku_or_code: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  bay?: string | null;
  shelf_location?: string | null;
}

export interface DbTransaction {
  id?: string;
  receipt_number: string;
  cashier_id?: string | null;
  cashier_name: string;
  pricing_mode: PricingMode;
  subtotal: number;
  discount_type?: TransactionDiscountType | null;
  discount_rate: number;
  discount_amount: number;
  total_due: number;
  cash_tendered: number;
  change_due: number;
  payment_method: TransactionPaymentMethod;
  created_at?: string;
  items?: DbTransactionItem[];
}
```
