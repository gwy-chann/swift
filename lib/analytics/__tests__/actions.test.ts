import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getExecutiveKpisAction,
  getRevenueTrendAction,
  getCategoryPnlAction,
  getServiceBayStatusAction,
  updateWorkOrderStatusAction,
} from '../actions.ts';

test('getExecutiveKpisAction - returns typed executive KPI payload', async () => {
  const kpis = await getExecutiveKpisAction();

  assert.ok(typeof kpis.gross_revenue_today === 'number');
  assert.ok(typeof kpis.gross_revenue_yesterday === 'number');
  assert.ok(typeof kpis.revenue_growth_pct === 'number');
  assert.ok(typeof kpis.active_work_orders_count === 'number');
  assert.ok(typeof kpis.pending_parts_count === 'number');
  assert.ok(typeof kpis.net_profit_margin_pct === 'number');
  assert.ok(typeof kpis.gross_profit_amount === 'number');
  assert.ok(typeof kpis.critical_low_stock_count === 'number');
  assert.ok(kpis.gross_revenue_today >= 0);
});

test('getRevenueTrendAction - returns 7-day revenue trend comparison', async () => {
  const trend = await getRevenueTrendAction();

  assert.ok(Array.isArray(trend.days));
  assert.strictEqual(trend.days.length, 7);
  assert.ok(trend.peak_day_amount >= 0);
  assert.ok(trend.total_weekly_revenue >= 0);

  // Validate each day's bar height structure
  for (const day of trend.days) {
    assert.ok(typeof day.day_label === 'string');
    assert.ok(typeof day.parts_amount === 'number');
    assert.ok(typeof day.labor_amount === 'number');
    assert.ok(typeof day.total_amount === 'number');
    assert.ok(typeof day.parts_height_percent === 'number');
    assert.ok(typeof day.labor_height_percent === 'number');
  }
});

test('getCategoryPnlAction - returns categorized P&L for daily, weekly, and monthly periods', async () => {
  const daily = await getCategoryPnlAction({ period: 'daily' });
  assert.ok(Array.isArray(daily.categories));
  assert.ok(daily.categories.length > 0);
  assert.ok(daily.summary.total_gross_revenue >= 0);

  const weekly = await getCategoryPnlAction({ period: 'weekly' });
  assert.ok(Array.isArray(weekly.categories));
  assert.ok(weekly.summary.total_gross_revenue >= daily.summary.total_gross_revenue);

  const monthly = await getCategoryPnlAction({ period: 'monthly' });
  assert.ok(Array.isArray(monthly.categories));
  assert.ok(monthly.summary.total_gross_revenue >= weekly.summary.total_gross_revenue);

  // Validate Labor item has 0 COGS and 100% margin
  const labor = daily.categories.find((c) => c.category.toLowerCase().includes('labor'));
  assert.ok(labor, 'Workshop Labor category should exist');
  assert.strictEqual(labor.cogs, 0);
  assert.strictEqual(labor.margin_pct, 100);
});

test('getServiceBayStatusAction - returns service bay operational status list', async () => {
  const bays = await getServiceBayStatusAction();

  assert.ok(Array.isArray(bays));
  assert.ok(bays.length > 0);
  for (const bay of bays) {
    assert.ok(typeof bay.id === 'string');
    assert.ok(typeof bay.bayName === 'string');
    assert.ok(['AVAILABLE', 'IN PROGRESS', 'QUEUED', 'PENDING_PARTS', 'MAINTENANCE', 'COMPLETED'].includes(bay.status));
    assert.ok(typeof bay.vehicleService === 'string');
    assert.ok(typeof bay.mechanicInfo === 'string');
  }
});

test('updateWorkOrderStatusAction - updates work order status and validates payload', async () => {
  const testOrderId = 'f0000000-0000-0000-0000-000000000001';
  const result = await updateWorkOrderStatusAction(testOrderId, 'COMPLETED', 'Finished test service');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.orderId, testOrderId);
  assert.strictEqual(result.status, 'COMPLETED');
  assert.ok(typeof result.updatedAt === 'string');
});

test('updateWorkOrderStatusAction - rejects invalid status gracefully', async () => {
  const testOrderId = 'f0000000-0000-0000-0000-000000000001';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await updateWorkOrderStatusAction(testOrderId, 'INVALID_STATUS' as any);

  assert.strictEqual(result.success, false);
  assert.ok(result.error);
});
