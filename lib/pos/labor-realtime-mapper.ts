import type { LaborService } from '../types/service.ts';

/**
 * Maps raw PostgreSQL Realtime payload record for public.labor_services to domain LaborService.
 */
export function mapRealtimeDbServiceToLaborService(
  record: Record<string, unknown>
): LaborService {
  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    code: String(record.code ?? ''),
    name: String(record.name ?? ''),
    bay: String(record.bay ?? ''),
    rate: Number(record.rate ?? 0),
    duration: String(record.duration ?? ''),
    description: typeof record.description === 'string' ? record.description : undefined,
    active: typeof record.active === 'boolean' ? record.active : true,
    createdAt: (record.created_at ?? record.createdAt) as string,
    updatedAt: (record.updated_at ?? record.updatedAt) as string
  };
}
