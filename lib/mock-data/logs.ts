import { StockAdjustmentLog, AuditLog, PunchLog } from '@/lib/types/logs';

export const MOCK_STOCK_ADJUSTMENT_LOGS: StockAdjustmentLog[] = [
  {
    id: 'ADJ-8821',
    timestamp: '2026-09-28 14:22',
    sku: 'YAM-NMAX-BL01',
    type: 'Audit Adjustment',
    change: '-2 Units',
    reason: 'Physical inventory count reconciliation',
    user: 'Carlos Rodriguez'
  },
  {
    id: 'ADJ-8820',
    timestamp: '2026-09-28 11:05',
    sku: 'MOT-3100-10W40',
    type: 'Restock Inbound',
    change: '+24 Units',
    reason: 'PO-4091 Supplier Delivery Received',
    user: 'Rico Santos'
  },
  {
    id: 'ADJ-8819',
    timestamp: '2026-09-27 16:45',
    sku: 'NGK-CPR8EA9',
    type: 'Damaged Goods',
    change: '-1 Unit',
    reason: 'Cracked porcelain during shelving',
    user: 'Mike Morales'
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'AUD-5091',
    timestamp: '2026-09-28 16:30',
    user: 'Carlos Rodriguez',
    action: 'Modified Global Retail Markup rule from 30% to 35%',
    ip: '192.168.1.100 (Admin PC)'
  },
  {
    id: 'AUD-5090',
    timestamp: '2026-09-28 15:10',
    user: 'Mike Morales',
    action: 'Applied 20% Senior Citizen Discount on TX-1041',
    ip: '192.168.1.102 (Terminal 1)'
  },
  {
    id: 'AUD-5089',
    timestamp: '2026-09-28 14:22',
    user: 'Carlos Rodriguez',
    action: 'Executed Stock Adjustment ADJ-8821 on SKU YAM-NMAX-BL01',
    ip: '192.168.1.100 (Admin PC)'
  },
  {
    id: 'AUD-5088',
    timestamp: '2026-09-28 08:00',
    user: 'Mike Morales',
    action: 'Staff Shift Time-In (Shift #492)',
    ip: '192.168.1.102 (Terminal 1)'
  }
];

export const MOCK_PUNCH_LOGS: PunchLog[] = [
  {
    id: 'PUNCH-101',
    date: '2026-09-28',
    staff: 'Mike Morales',
    timeIn: '08:00:15 AM',
    timeOut: '-- Active Shift --',
    duration: '04h 12m',
    status: 'On Shift'
  },
  {
    id: 'PUNCH-102',
    date: '2026-09-27',
    staff: 'Mike Morales',
    timeIn: '08:02:10 AM',
    timeOut: '05:01:45 PM',
    duration: '08h 59m',
    status: 'Completed'
  },
  {
    id: 'PUNCH-103',
    date: '2026-09-26',
    staff: 'Mike Morales',
    timeIn: '07:55:00 AM',
    timeOut: '05:00:20 PM',
    duration: '09h 05m',
    status: 'Completed'
  }
];
