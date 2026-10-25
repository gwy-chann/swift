/**
 * TypeScript API contracts and Zod validation schemas for SIAA-97:
 * High-Performance Executive Analytics Virtual Threads & Streamed Accounting CSV
 */

export interface ExecutiveKpiContract {
  grossRevenueToday: number;
  grossRevenueYesterday: number;
  revenueGrowthPct: number;
  activeWorkOrdersCount: number;
  pendingPartsCount: number;
  netProfitMarginPct: number;
  grossProfitAmount: number;
  criticalLowStockCount: number;
}

export interface RevenueTrendDayContract {
  date: string;
  dayLabel: string;
  partsAmount: number;
  partsDisplay?: string;
  laborAmount: number;
  laborDisplay?: string;
  totalAmount: number;
  partsHeightPercent: number;
  laborHeightPercent: number;
}

export interface WeeklyRevenueContract {
  days: RevenueTrendDayContract[];
  peakDayAmount: number;
  totalPartsWeekly: number;
  totalLaborWeekly: number;
  totalWeeklyRevenue: number;
}

export interface CategoryPnlItemContract {
  category: string;
  unitsSold: number;
  grossRevenue: number;
  cogs: number;
  netProfit: number;
  marginPct: number;
}

export interface CategoryPnlSummaryContract {
  totalUnitsSold: number;
  totalGrossRevenue: number;
  totalCogs: number;
  totalNetProfit: number;
  overallMarginPct: number;
}

export interface CategoryPnlContract {
  categories: CategoryPnlItemContract[];
  summary: CategoryPnlSummaryContract;
}

export interface ServiceBayDisplayContract {
  id: string;
  bayName: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'IN PROGRESS' | 'QUEUED' | 'PENDING_PARTS' | 'STANDBY';
  vehicleService: string;
  mechanicInfo: string;
}

export interface ExecutiveDashboardResponseContract {
  kpis: ExecutiveKpiContract;
  revenueTrend: WeeklyRevenueContract;
  categoryPnl: CategoryPnlContract;
  serviceBays: ServiceBayDisplayContract[];
}

export interface UpdateWorkOrderStatusRequestContract {
  status: 'QUEUED' | 'IN PROGRESS' | 'PENDING_PARTS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface UpdateWorkOrderResponseContract {
  success: boolean;
  orderId: string;
  status: string;
  updatedAt: string;
  error?: string;
}

export interface AccountingCsvExportParamsContract {
  period?: 'daily' | 'weekly' | 'monthly' | 'annual';
  startDate?: string;
  endDate?: string;
}
