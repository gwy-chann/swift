# Data Model: Cash Tender & Payment Processing with Real-Time Change Calculation

**Feature**: `022-cash-tender-payment-processing`  
**Ticket**: [SIAA-21](https://the-three-devsketeers.atlassian.net/browse/SIAA-21)  
**Date**: 2026-10-12  

---

## 1. Domain Entities & State Structures

### `CashTenderResult`
Represents the evaluated mathematical state of the cash tender against total due:

```typescript
export interface CashTenderResult {
  totalDue: number;       // e.g. 880.00
  cashTendered: number;   // e.g. 1000.00
  changeDue: number;      // e.g. 120.00 (0 if under-tendered)
  shortage: number;       // e.g. 0.00 (or 380.00 if under-tendered)
  isValid: boolean;       // true if cashTendered >= totalDue && totalDue > 0
  isExact: boolean;       // true if cashTendered === totalDue
}
```

### `QuickDenomination`
Represents a smart quick-cash button:

```typescript
export interface QuickDenomination {
  label: string;          // e.g. "Exact ₱880", "₱1,000", "₱1,500", "₱2,000"
  amount: number;         // e.g. 880, 1000, 1500, 2000
  isExact: boolean;       // true for exact amount
}
```

### `CashTenderModalProps`
Modal interface props:

```typescript
export interface CashTenderModalProps {
  isOpen: boolean;
  totalDue: number;
  isProcessing?: boolean;
  onClose: () => void;
  onConfirmPayment: (tenderedAmount: number, changeDue: number) => Promise<void> | void;
}
```

---

## 2. Mathematical Invariants & State Transitions

```mermaid
stateDiagram-v2
    [*] --> Idle: Modal Opened (totalDue > 0)
    Idle --> Evaluated: Cash Tendered Entered / Denomination Clicked
    
    state Evaluated {
      [*] --> CheckTender
      CheckTender --> UnderTender: cashTendered < totalDue
      CheckTender --> ExactTender: cashTendered == totalDue
      CheckTender --> OverTender: cashTendered > totalDue
      
      UnderTender: Shortage = totalDue - cashTendered
      UnderTender: Change = 0
      UnderTender: Submit Disabled (Shortage Banner)
      
      ExactTender: Shortage = 0
      ExactTender: Change = 0
      ExactTender: Submit Enabled (Exact Banner)
      
      OverTender: Shortage = 0
      OverTender: Change = cashTendered - totalDue
      OverTender: Submit Enabled (Change Banner)
    }

    UnderTender --> Evaluated: Adjust Tender
    ExactTender --> CheckoutSubmitted: Enter / F12 / Click Pay
    OverTender --> CheckoutSubmitted: Enter / F12 / Click Pay
    CheckoutSubmitted --> [*]: Close Modal & Open Receipt
    Idle --> [*]: Esc / Cancel
```

---

## 3. Storage & Transaction Mapping

The verified `cashTendered` and `changeDue` flow directly into the existing database schema:
- `pos_transactions.cash_tendered`: `DECIMAL(10, 2)`
- `pos_transactions.change_due`: `DECIMAL(10, 2)`
- `pos_transactions.payment_method`: `'Cash'`
- `thermal_receipt_data.cashTendered`: `number`
- `thermal_receipt_data.changeDue`: `number`
