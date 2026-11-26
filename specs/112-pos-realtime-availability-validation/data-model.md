# Domain Data Models: POS Real-Time Availability Validation & Sold-Out Rejection

**Feature**: `112-pos-realtime-availability-validation`  
**Jira Ticket**: [SIAA-112](https://the-three-devsketeers.atlassian.net/browse/SIAA-112)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109)  

---

## 1. Domain Entities & Validation Enums

```mermaid
classDiagram
    class PosScanStatus {
        <<enumeration>>
        SUCCESS
        OUT_OF_STOCK
        EXCEEDS_STOCK
        NOT_FOUND
    }

    class PosScanValidationResponse {
        +PosScanStatus status
        +string? sku
        +string? name
        +number? price
        +number? stockRemaining
        +number? availableStock
        +number? requestedQty
        +number? currentCartQty
        +number? cartItemCount
        +number? cartTotal
        +string? query
        +string? message
        +number? timestamp
    }

    class AvailabilityCheckResult {
        +boolean canAdd
        +PosScanStatus status
        +string? reason
        +number availableStock
        +number currentCartQty
        +number targetQty
    }

    PosScanValidationResponse --> PosScanStatus : status
    AvailabilityCheckResult --> PosScanStatus : status
```

---

## 2. State Transition Flow

```mermaid
stateDiagram-v2
    [*] --> ScanInput: Raw Barcode / SKU Scanned
    ScanInput --> CatalogLookup: resolveBarcodeScanQuery()
    
    CatalogLookup --> NotFound: No SKU / Barcode / Service Match
    NotFound --> BroadcastNotFound: Broadcast { status: 'NOT_FOUND' }
    NotFound --> ToastNotFound: Toast 'Item code or barcode not found'

    CatalogLookup --> StockEvaluation: Product Found
    
    StockEvaluation --> SoldOut: product.stock <= 0
    SoldOut --> RejectCart: Do not alter cart
    SoldOut --> ToastSoldOut: Toast 'Cannot add [Item]: Item is out of stock'
    SoldOut --> BroadcastSoldOut: Broadcast { status: 'OUT_OF_STOCK' }

    StockEvaluation --> CeilingCheck: product.stock > 0
    CeilingCheck --> ExceedsStock: cartQty + 1 > product.stock
    ExceedsStock --> RejectCart: Do not alter cart
    ExceedsStock --> ToastExceeds: Toast 'Cannot add another [Item]: Exceeds available stock (X units max)'
    ExceedsStock --> BroadcastExceeds: Broadcast { status: 'EXCEEDS_STOCK' }

    CeilingCheck --> InStock: cartQty + 1 <= product.stock
    InStock --> AddToCart: addPart(product, 1)
    AddToCart --> ApplyPricingTier: retail vs wholesale price
    AddToCart --> BroadcastSuccess: Broadcast { status: 'SUCCESS' }
```

---

## 3. Realtime Broadcast Payload Specifications

### Success Payload:
```json
{
  "status": "SUCCESS",
  "sku": "YAM-NMAX-BL01",
  "name": "Yamaha NMAX Brake Pad Set",
  "price": 480.00,
  "stockRemaining": 11,
  "cartItemCount": 1,
  "cartTotal": 480.00,
  "timestamp": 1732628400000
}
```

### Out-of-Stock Payload:
```json
{
  "status": "OUT_OF_STOCK",
  "sku": "HON-CLK-DRV01",
  "name": "Honda Click Drive Belt 125i",
  "requestedQty": 1,
  "availableStock": 0,
  "message": "Item is sold out",
  "timestamp": 1732628400000
}
```

### Exceeds Stock Payload:
```json
{
  "status": "EXCEEDS_STOCK",
  "sku": "MOT-3100-10W40",
  "name": "Motul 3100 Silver 10W40 1L",
  "currentCartQty": 2,
  "availableStock": 2,
  "message": "Cannot add another Motul 3100 Silver 10W40 1L: Exceeds available stock (2 units max)",
  "timestamp": 1732628400000
}
```

### Not Found Payload:
```json
{
  "status": "NOT_FOUND",
  "query": "INVALID-SKU-99",
  "message": "Barcode not found in catalog",
  "timestamp": 1732628400000
}
```
