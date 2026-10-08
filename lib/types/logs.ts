export interface StockAdjustmentLog {
  id: string;
  timestamp: string;
  sku: string;
  type: 'Audit Adjustment' | 'Restock Inbound' | 'Damaged Goods' | 'Shrinkage' | string;
  change: string; // e.g. "-2 Units", "+24 Units"
  reason: string;
  user: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
}

export interface PunchLog {
  id?: string;
  date: string;
  staff: string;
  timeIn: string;
  timeOut: string;
  duration: string;
  status: 'On Shift' | 'Completed' | 'Break' | string;
}
