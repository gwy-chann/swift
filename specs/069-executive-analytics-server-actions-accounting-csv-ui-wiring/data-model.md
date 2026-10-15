# Data Model: Executive Analytics Next.js Server Actions, Accounting CSV Dispatcher & UI Wiring

**Feature**: SIAA-69 (STORY-6.9)  
**Parent Epic**: SIAA-6 (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Date**: 2026-10-15  

---

## 1. Action Request & Response Types

### 1.1 Period Filter Request
```typescript
export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

export interface GetCategoryPnlParams {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
}
```

### 1.2 Service Bay Status Item (UI Model)
```typescript
export interface ServiceBayDisplayItem {
  id: string;
  bayName: string;
  status: 'AVAILABLE' | 'IN PROGRESS' | 'QUEUED' | 'PENDING_PARTS' | 'MAINTENANCE';
  vehicleService: string;
  mechanicInfo: string;
}
```

### 1.3 Work Order Status Update Request
```typescript
export type WorkOrderStatus = 'QUEUED' | 'IN PROGRESS' | 'PENDING_PARTS' | 'COMPLETED' | 'CANCELLED';

export interface UpdateWorkOrderParams {
  orderId: string;
  status: WorkOrderStatus;
  notes?: string;
}

export interface UpdateWorkOrderResult {
  success: boolean;
  orderId: string;
  status: WorkOrderStatus;
  updatedAt: string;
  error?: string;
}
```

### 1.4 Accounting CSV Export Result
```typescript
export interface AccountingCsvExportResult {
  success: boolean;
  filename: string;
  csvContent: string;
  rowCount: number;
  period: AnalyticsPeriod;
  generatedAt: string;
  error?: string;
}
```

---

## 2. Server Action Return Contracts

All Server Actions return standard discriminated union results or strongly typed domain models:

```typescript
export interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

- `getExecutiveKpisAction(): Promise<ExecutiveKpiData>`
- `getRevenueTrendAction(): Promise<WeeklyRevenueData>`
- `getCategoryPnlAction(params?: GetCategoryPnlParams): Promise<CategoryPnlData>`
- `getServiceBayStatusAction(): Promise<ServiceBayDisplayItem[]>`
- `updateWorkOrderStatusAction(orderId: string, status: WorkOrderStatus, notes?: string): Promise<UpdateWorkOrderResult>`
- `exportAccountingCsvAction(params?: GetCategoryPnlParams): Promise<AccountingCsvExportResult>`

---

## 3. Financial Calculation & CSV Formatting Invariants

1. **Header Row (Exact Order)**:
   `Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %`
2. **Numeric Precision**:
   - `Gross Revenue`: 2 decimal places (`45230.00`).
   - `COGS`: 2 decimal places (`26850.00`).
   - `Net Profit`: 2 decimal places (`18380.00`).
   - `Margin %`: 2 decimal places with `%` suffix or pure numeric formatted as per specification (`40.64`).
3. **Summary Footer**:
   `Total,<total_units>,<total_gross>,<total_cogs>,<total_net>,<overall_margin>%`
4. **RFC 4180 Escaping**:
   Values containing commas (e.g. `"Engine, Belts & Pulleys"`) are enclosed in quotes.
