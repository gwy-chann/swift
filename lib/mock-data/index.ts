export * from './products';
export * from './services';
export * from './motorcycles';
export * from './users';
export * from './pricing';
export * from './logs';

import { MOCK_PRODUCTS } from './products';
import { MOCK_SERVICES } from './services';
import { MOCK_MOTORCYCLE_MODELS, MOCK_COMPATIBILITY_RULES } from './motorcycles';
import { MOCK_USERS } from './users';
import { MOCK_PRICING_RULES } from './pricing';
import { MOCK_STOCK_ADJUSTMENT_LOGS, MOCK_AUDIT_LOGS, MOCK_PUNCH_LOGS } from './logs';

export const SWIFT_SEED_DATABASE = {
  inventory: MOCK_PRODUCTS,
  services: MOCK_SERVICES,
  motoModels: MOCK_MOTORCYCLE_MODELS,
  compatibilityRules: MOCK_COMPATIBILITY_RULES,
  users: MOCK_USERS,
  pricingRules: MOCK_PRICING_RULES,
  stockAdjustmentLogs: MOCK_STOCK_ADJUSTMENT_LOGS,
  auditLogs: MOCK_AUDIT_LOGS,
  punchLogs: MOCK_PUNCH_LOGS
};
