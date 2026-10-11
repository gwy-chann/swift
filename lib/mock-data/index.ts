export * from './products.ts';
export * from './services.ts';
export * from './motorcycles.ts';
export * from './users.ts';
export * from './pricing.ts';
export * from './logs.ts';
import { MOCK_PRODUCTS } from './products.ts';
import { MOCK_SERVICES } from './services.ts';
import { MOCK_MOTORCYCLE_MODELS, MOCK_COMPATIBILITY_RULES, MOCK_MOTORCYCLE_MODEL_RECORDS } from './motorcycles.ts';
import { MOCK_USERS } from './users.ts';
import { MOCK_PRICING_RULES } from './pricing.ts';
import { MOCK_STOCK_ADJUSTMENT_LOGS, MOCK_AUDIT_LOGS, MOCK_PUNCH_LOGS } from './logs.ts';

export const SWIFT_SEED_DATABASE = {
  inventory: MOCK_PRODUCTS,
  services: MOCK_SERVICES,
  motoModels: MOCK_MOTORCYCLE_MODELS,
  motoModelRecords: MOCK_MOTORCYCLE_MODEL_RECORDS,
  compatibilityRules: MOCK_COMPATIBILITY_RULES,
  users: MOCK_USERS,
  pricingRules: MOCK_PRICING_RULES,
  stockAdjustmentLogs: MOCK_STOCK_ADJUSTMENT_LOGS,
  auditLogs: MOCK_AUDIT_LOGS,
  punchLogs: MOCK_PUNCH_LOGS
};

export const SWIFT_DB = SWIFT_SEED_DATABASE;
