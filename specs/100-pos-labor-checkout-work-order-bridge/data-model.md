# Data Model & State Architecture: Automatic POS Labor Checkout to Service Bay Work Order Queue Bridge

**Feature**: `100-pos-labor-checkout-work-order-bridge`  
**Jira Ticket**: [SIAA-100](https://the-three-devsketeers.atlassian.net/browse/SIAA-100)  

---

## 1. Domain Entities & Storage Schemas

### POS Transaction to Work Order Bridge Mapping

```mermaid
erDiagram
    TRANSACTIONS ||--|{ TRANSACTION_ITEMS : contains
    TRANSACTIONS ||--o{ WORK_ORDERS : "provisions (if service item present)"
    SERVICE_BAYS ||--o{ WORK_ORDERS : "allocated to"
    PROFILES ||--o{ WORK_ORDERS : "claimed by mechanic"
    
    TRANSACTIONS {
        uuid id PK
        string receipt_number UK
        string cashier_name
        string pricing_mode
        decimal total_due
        timestamp created_at
    }

    TRANSACTION_ITEMS {
        uuid id PK
        uuid transaction_id FK
        string item_type "part | service"
        string item_sku_or_code
        string item_name
        decimal unit_price
        int quantity
        decimal subtotal
        string bay
    }

    WORK_ORDERS {
        uuid id PK
        string order_number UK
        uuid bay_id FK "nullable"
        string customer_name
        string vehicle_model
        string plate_number
        string service_code
        string service_name
        uuid mechanic_id FK "nullable (unassigned)"
        string status "QUEUED"
        int estimated_duration_minutes
        text notes
        timestamp created_at
    }

    SERVICE_BAYS {
        uuid id PK
        string name UK
        string status "AVAILABLE | OCCUPIED | QUEUED"
    }
```

---

### Extended Data Transfer Objects (DTOs)

#### 1. Checkout Customer Intake Details (`CheckoutIntakePayload`)

```typescript
export interface CheckoutIntakePayload {
  customerName?: string;
  vehicleModel?: string;
  plateNumber?: string;
  technicianNotes?: string;
}
```

#### 2. Extended `CheckoutPayload` (`lib/types/transaction.ts`)

```typescript
export interface CheckoutPayload extends CheckoutIntakePayload {
  receiptNumber?: string;
  cashierId?: string | null;
  cashierName?: string;
  pricingMode: PricingMode;
  subtotal: number;
  discountType?: TransactionDiscountType | null;
  discountRate: number;
  discountAmount: number;
  totalDue: number;
  cashTendered: number;
  changeDue: number;
  paymentMethod: TransactionPaymentMethod;
  items: CheckoutItemPayload[];
}
```

#### 3. Extended `CheckoutActionResult` (`lib/types/transaction.ts`)

```typescript
export type CheckoutActionResult =
  | {
      success: true;
      transactionId: string;
      receiptNumber: string;
      itemsCount: number;
      partsDecremented: number;
      workOrdersCreated: number;
      workOrderNumbers: string[];
      createdAt: string;
    }
  | {
      success: false;
      code: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_FOUND' | 'VALIDATION_ERROR' | 'CHECKOUT_FAILED';
      sku?: string;
      error: string;
    };
```

---

## 2. Work Order Lifecycle & Bridge State Machine

```mermaid
stateDiagram-v2
    [*] --> POS_CHECKOUT: Customer Cart Tendered
    
    state POS_CHECKOUT {
        [*] --> CheckCartItems
        CheckCartItems --> PureParts: Only parts (item_type='part')
        CheckCartItems --> HasLaborService: At least 1 service item
        
        PureParts --> DecrementInventory: Decrement stock
        DecrementInventory --> ReturnReceipt: No Work Order Created
        
        HasLaborService --> ProvisionWorkOrder: Auto-generate WO-2026-XXXX
        ProvisionWorkOrder --> SetQueuedUnassigned: status=QUEUED, mechanic=null
        SetQueuedUnassigned --> BroadcastRealtime: Channel operational-intelligence
    }
    
    ReturnReceipt --> [*]
    BroadcastRealtime --> WorkshopBayQueue: Appears on /staff/work-orders
    
    state WorkshopBayQueue {
        QUEUED_UNASSIGNED: Status QUEUED (Unassigned)
        IN_PROGRESS: Status IN PROGRESS (Claimed)
        
        QUEUED_UNASSIGNED --> IN_PROGRESS: Mechanic clicks "Claim Job"
    }
```

---

## 3. Data Invariants

1. **Service Item Detection**: A work order is ONLY provisioned when `items.some(i => i.itemType === 'service')` evaluates to true.
2. **Order Number Uniqueness**: `order_number` MUST follow the format `WO-YYYY-XXXX` and maintain unique constraint in `public.work_orders`.
3. **Unassigned Invariant**: New work orders MUST have `mechanic_id = null` and `status = 'QUEUED'`.
4. **Resilient Non-Blocking Bridge**: If work order broadcast or insertion encounters a recoverable error, financial checkout MUST NOT be reverted unless the entire transaction fails.
