# Data Model & Entity Specifications: Executive KPI Dashboard & Real-Time Operational Health Metric Cards

**Feature**: Executive KPI Dashboard & Real-Time Operational Health Metric Cards  
**Jira Issue**: [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (STORY-6.1)  

---

## 1. Domain Entities & Interfaces

```typescript
/**
 * Executive KPI Grid Display Props & Model
 */
export interface AdminKpiGridProps {
  /** Today's gross revenue amount in Philippine Pesos */
  grossRevenue?: number;
  /** Yesterday's gross revenue amount for comparative variance calculation */
  grossRevenueYesterday?: number;
  /** Explicit revenue growth percentage (e.g. 14.2 for +14.2%) */
  revenueGrowthPct?: number;
  /** Whether the gross revenue card should display the pulsing LIVE badge */
  livePulse?: boolean;
  /** Recent incremental sales amount received from POS checkout */
  salesIncrement?: number | null;
  /** Count of active repair bay work orders currently in progress */
  activeWorkOrders?: number;
  /** Count of service bay jobs pending counter parts retrieval */
  pendingPartsWorkOrders?: number;
  /** Synthesized net profit margin percentage for the current month */
  netProfitMarginPct?: number;
  /** Total cumulative gross profit amount in Philippine Pesos */
  grossProfitAmount?: number;
  /** Count of inventory SKUs at or below safety stock threshold */
  lowStockCount?: number;
  /** Whether high-visibility danger styling should be forced on low stock */
  isLowStockDanger?: boolean;
  /** Optional custom click handler when clicking the low-stock card */
  onLowStockClick?: () => void;
  /** Target href for low stock redirection (defaults to '/admin/inventory?status=low_stock') */
  lowStockHref?: string;
}

/**
 * Representation of an individual KPI metric card in the grid
 */
export interface KpiCardConfig {
  id: string;
  title: string;
  badge: string;
  badgeVariant: 'default' | 'live' | 'danger';
  value: string;
  valueColor?: string;
  subtext: string;
  subtextColor: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * Calculated Revenue Variance Result
 */
export interface RevenueGrowthResult {
  growthPct: number;
  formattedText: string;
  isPositive: boolean;
}
```

---

## 2. State Machine & Transition Logic

### Card 1: Gross Revenue
- **Default State**:
  - Badge: `Today` (`bg-bg-muted text-text-secondary`)
  - Subtext: `+14.2% vs yesterday` (or computed variance)
- **Live Pulse Event State** (`livePulse === true` for 4 seconds):
  - Badge: `LIVE` with animated ping radio icon (`bg-success-light text-success`)
  - Border: `border-success/60 ring-1 ring-success/30`
  - Subtext: `+₱<amount> sale just received!`

### Card 2: Work Orders Queue
- **State**:
  - Value: `<activeOrders> Active`
  - Subtext: `<pendingParts> Pending Parts Assembly` (`text-accent`)

### Card 3: Net Profit Margin
- **State**:
  - Value: `<marginPct>%` (e.g., `34.8%`)
  - Subtext: `₱<amount> Gross Profit` (`text-success`)

### Card 4: Critical Low Stock
- **Healthy State** (`lowStockCount === 0`):
  - Badge: `Optimal`
  - Value: `0 SKUs` (`text-text-primary`)
  - Subtext: `All items above threshold` (`text-text-muted`)
  - Card Border: `border-border hover:border-primary/40`
- **Critical Action Required State** (`lowStockCount > 0` or `isLowStockDanger === true`):
  - Badge: `ALERT` (`bg-danger-light text-danger border border-danger/30`)
  - Value: `<count> SKUs` (`text-danger`)
  - Subtext: `Restock immediately` (`text-danger`)
  - Card Border: `border-danger/60 ring-1 ring-danger/30 hover:border-danger`
  - Interactive Action: Navigates to `/admin/inventory?status=low_stock`
