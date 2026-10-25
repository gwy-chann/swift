# Data Model & Storage Specifications: High-Concurrency POS Checkout Orchestration & Thermal Receipts

**Feature**: `specs/096-pos-checkout-orchestration-thermal-receipts`  
**Jira Issue**: [SIAA-96](https://the-three-devsketeers.atlassian.net/browse/SIAA-96)  

---

## 1. Domain Entities & Database Schema

### Table: `public.transactions`
Master ledger table storing completed sales transactions.

```sql
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    cashier_id UUID REFERENCES public.profiles(id),
    cashier_name TEXT NOT NULL,
    pricing_mode TEXT NOT NULL DEFAULT 'retail', -- 'retail' | 'wholesale'
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_type TEXT,                          -- 'Senior Citizen' | 'PWD' | 'VIP Customer' | 'Wholesale Tier 2'
    discount_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_due NUMERIC(10, 2) NOT NULL,
    cash_tendered NUMERIC(10, 2) NOT NULL,
    change_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'Cash', -- 'Cash' | 'GCash' | 'Card'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_receipt_number ON public.transactions(receipt_number);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at_desc ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier_id ON public.transactions(cashier_id);
```

### Table: `public.transaction_items`
Itemized line items purchased per transaction.

```sql
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,                     -- 'part' | 'service'
    item_sku_or_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL,
    bay TEXT,                                    -- Bay #1, Bay #2, etc. (for services)
    shelf_location TEXT                          -- Shelf locator code (for physical parts)
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_tx_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_sku_code ON public.transaction_items(item_sku_or_code);
```

---

## 2. Spring Data JPA Entity Mappings

### `Transaction` Entity (`com.swift.modules.pos.model.Transaction`)
```java
@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "receipt_number", nullable = false, unique = true)
    private String receiptNumber;

    @Column(name = "cashier_id")
    private UUID cashierId;

    @Column(name = "cashier_name", nullable = false)
    private String cashierName;

    @Column(name = "pricing_mode", nullable = false)
    private String pricingMode;

    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_type")
    private String discountType;

    @Column(name = "discount_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal discountRate;

    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "total_due", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalDue;

    @Column(name = "cash_tendered", nullable = false, precision = 10, scale = 2)
    private BigDecimal cashTendered;

    @Column(name = "change_due", nullable = false, precision = 10, scale = 2)
    private BigDecimal changeDue;

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TransactionItem> items = new ArrayList<>();
}
```

### `TransactionItem` Entity (`com.swift.modules.pos.model.TransactionItem`)
```java
@Entity
@Table(name = "transaction_items")
public class TransactionItem {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false)
    private Transaction transaction;

    @Column(name = "item_type", nullable = false)
    private String itemType;

    @Column(name = "item_sku_or_code", nullable = false)
    private String itemSkuOrCode;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "bay")
    private String bay;

    @Column(name = "shelf_location")
    private String shelfLocation;
}
```

---

## 3. Data Transfer Objects (DTOs)

### `PosCheckoutRequest`
```java
public record PosCheckoutRequest(
    String receiptNumber,
    UUID cashierId,
    @NotBlank(message = "Cashier name is required") String cashierName,
    String pricingMode,
    @NotNull(message = "Subtotal is required") @DecimalMin("0.00") BigDecimal subtotal,
    String discountType,
    BigDecimal discountRate,
    BigDecimal discountAmount,
    @NotNull(message = "Total due is required") @DecimalMin("0.00") BigDecimal totalDue,
    @NotNull(message = "Cash tendered is required") @DecimalMin("0.00") BigDecimal cashTendered,
    BigDecimal changeDue,
    String paymentMethod,
    @NotEmpty(message = "Checkout items cannot be empty") @Valid List<PosCheckoutItemDto> items
) {}
```

### `PosCheckoutItemDto`
```java
public record PosCheckoutItemDto(
    @NotBlank(message = "Item type is required") String itemType,
    @NotBlank(message = "Item SKU or service code is required") String itemSkuOrCode,
    @NotBlank(message = "Item name is required") String itemName,
    @NotNull(message = "Unit price is required") @DecimalMin("0.00") BigDecimal unitPrice,
    @NotNull(message = "Quantity is required") @Min(1) Integer quantity,
    @NotNull(message = "Subtotal is required") @DecimalMin("0.00") BigDecimal subtotal,
    String shelfLocation,
    String bay
) {}
```

### `PosCheckoutResponse`
```java
public record PosCheckoutResponse(
    boolean success,
    UUID transactionId,
    String receiptNumber,
    int itemsCount,
    int partsDecremented,
    BigDecimal subtotal,
    BigDecimal discountAmount,
    BigDecimal totalDue,
    BigDecimal cashTendered,
    BigDecimal changeDue,
    String createdAt
) {}
```

### `ThermalReceiptResponse`
```java
public record ThermalReceiptResponse(
    String receiptNumber,
    String timestamp,
    String cashierName,
    String pricingMode,
    BigDecimal subtotal,
    String discountType,
    BigDecimal discountRate,
    BigDecimal discountAmount,
    BigDecimal totalDue,
    BigDecimal cashTendered,
    BigDecimal changeDue,
    String paymentMethod,
    List<ThermalReceiptItemDto> items,
    String storeName,
    String address,
    String tin,
    String phone,
    String warrantyNotice,
    String escPosBase64,
    String escPosPrintable
) {}
```
