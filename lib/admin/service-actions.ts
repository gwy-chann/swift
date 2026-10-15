'use server';

import { getPrismaClient } from '../prisma.ts';
import type {
  LaborService,
  ServiceRateAuditLog,
  CreateLaborServicePayload,
  UpdateLaborServicePayload,
  ServiceActionResult
} from '../types/service.ts';
import { MOCK_SERVICES } from '../mock-data/services.ts';

// In-memory fallback cache for environments without a live PostgreSQL connection
let memoryServices: LaborService[] = [...MOCK_SERVICES];
const memoryAuditLogs: ServiceRateAuditLog[] = [];

async function safeRevalidatePaths(): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/rates');
    revalidatePath('/staff/pos');
  } catch {
    // Suppressed when executing in unit testing
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbServiceToDomain(record: Record<string, any>): LaborService {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    bay: record.bay,
    rate: Number(record.rate),
    duration: record.duration,
    description: record.description || undefined,
    active: Boolean(record.active),
    createdAt: record.created_at ?? record.createdAt,
    updatedAt: record.updated_at ?? record.updatedAt
  };
}

export async function getAdminLaborServicesAction(): Promise<LaborService[]> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const { data: dbServices, error } = await supabase
      .from('labor_services')
      .select('*')
      .order('code', { ascending: true });

    if (!error && dbServices && dbServices.length > 0) {
      return dbServices.map(mapDbServiceToDomain);
    }
  } catch (error) {
    console.warn(
      '[getAdminLaborServicesAction] Supabase query issue:',
      error instanceof Error ? error.message : String(error)
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = getPrismaClient() as any;
    if (prisma?.laborService) {
      const dbServices = await prisma.laborService.findMany({
        orderBy: { code: 'asc' }
      });

      if (dbServices && dbServices.length > 0) {
        return dbServices.map(mapDbServiceToDomain);
      }
    }
  } catch (error) {
    console.warn(
      '[getAdminLaborServicesAction] Prisma query issue:',
      error instanceof Error ? error.message : String(error)
    );
  }

  return memoryServices;
}

function validateCreateServiceInput(payload: CreateLaborServicePayload): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!payload.code || !payload.code.trim()) {
    errors.code = 'Service code is required.';
  } else if (!/^[A-Z0-9_-]+$/i.test(payload.code.trim())) {
    errors.code = 'Service code must contain only alphanumeric characters, dashes, or underscores.';
  }

  if (!payload.name || !payload.name.trim()) {
    errors.name = 'Service title is required.';
  }

  if (!payload.bay || !payload.bay.trim()) {
    errors.bay = 'Repair bay allocation is required.';
  }

  if (typeof payload.rate !== 'number' || isNaN(payload.rate) || payload.rate <= 0) {
    errors.rate = 'Flat labor rate must be greater than ₱0.00.';
  }

  if (!payload.duration || !payload.duration.trim()) {
    errors.duration = 'Estimated duration is required.';
  }

  return errors;
}

async function executeSupabaseCreateService(
  normalizedCode: string,
  payload: CreateLaborServicePayload
): Promise<ServiceActionResult<LaborService> | null> {
  try {
    const { createClient, createAdminClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('labor_services')
      .select('id, code')
      .ilike('code', normalizedCode)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `Labor service with code "${normalizedCode}" already exists.`,
        code: 'DUPLICATE_CODE'
      };
    }

    const insertData = {
      code: normalizedCode,
      name: payload.name.trim(),
      bay: payload.bay.trim(),
      rate: Number(payload.rate.toFixed(2)),
      duration: payload.duration.trim(),
      description: payload.description?.trim() || null,
      active: payload.active ?? true
    };

    let { data: inserted, error: insertError } = await supabase
      .from('labor_services')
      .insert(insertData)
      .select()
      .single();

    if (insertError && insertError.message.toLowerCase().includes('permission denied')) {
      const adminClient = createAdminClient();
      const retry = await adminClient
        .from('labor_services')
        .insert(insertData)
        .select()
        .single();

      if (!retry.error && retry.data) {
        inserted = retry.data;
        insertError = null;
      } else {
        insertError = retry.error;
      }
    }

    if (!insertError && inserted) {
      return { success: true, data: mapDbServiceToDomain(inserted) };
    }
  } catch (err) {
    console.warn('[createLaborServiceAction] Supabase error:', err);
  }
  return null;
}

async function executePrismaCreateService(
  normalizedCode: string,
  payload: CreateLaborServicePayload
): Promise<ServiceActionResult<LaborService> | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = getPrismaClient() as any;
    if (prisma?.laborService) {
      const existing = await prisma.laborService.findFirst({
        where: { code: { equals: normalizedCode, mode: 'insensitive' } }
      });

      if (existing) {
        return {
          success: false,
          error: `Labor service with code "${normalizedCode}" already exists.`,
          code: 'DUPLICATE_CODE'
        };
      }

      const created = await prisma.laborService.create({
        data: {
          code: normalizedCode,
          name: payload.name.trim(),
          bay: payload.bay.trim(),
          rate: Number(payload.rate.toFixed(2)),
          duration: payload.duration.trim(),
          description: payload.description?.trim() || null,
          active: payload.active ?? true
        }
      });

      return { success: true, data: mapDbServiceToDomain(created) };
    }
  } catch (err) {
    console.warn('[createLaborServiceAction] Prisma error:', err);
  }
  return null;
}

export async function createLaborServiceAction(
  payload: CreateLaborServicePayload
): Promise<ServiceActionResult<LaborService>> {
  const fieldErrors = validateCreateServiceInput(payload);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: 'Validation failed for one or more fields.',
      code: 'VALIDATION_ERROR',
      fieldErrors
    };
  }

  const normalizedCode = payload.code.trim().toUpperCase();

  const supabaseResult = await executeSupabaseCreateService(normalizedCode, payload);
  if (supabaseResult) {
    await safeRevalidatePaths();
    return supabaseResult;
  }

  const prismaResult = await executePrismaCreateService(normalizedCode, payload);
  if (prismaResult) {
    await safeRevalidatePaths();
    return prismaResult;
  }

  const memoryDuplicate = memoryServices.find(
    (s) => s.code.toUpperCase() === normalizedCode
  );
  if (memoryDuplicate) {
    return {
      success: false,
      error: `Labor service with code "${normalizedCode}" already exists.`,
      code: 'DUPLICATE_CODE'
    };
  }

  const newService: LaborService = {
    id: `srv-${Date.now()}`,
    code: normalizedCode,
    name: payload.name.trim(),
    bay: payload.bay.trim(),
    rate: Number(payload.rate.toFixed(2)),
    duration: payload.duration.trim(),
    description: payload.description?.trim(),
    active: payload.active ?? true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  memoryServices = [...memoryServices, newService];
  await safeRevalidatePaths();

  return { success: true, data: newService };
}

function buildServiceUpdateData(payload: UpdateLaborServicePayload): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name.trim();
  if (payload.bay !== undefined) updateData.bay = payload.bay.trim();
  if (payload.rate !== undefined) updateData.rate = Number(payload.rate.toFixed(2));
  if (payload.duration !== undefined) updateData.duration = payload.duration.trim();
  if (payload.description !== undefined) updateData.description = payload.description.trim() || null;
  if (payload.active !== undefined) updateData.active = payload.active;
  return updateData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logServiceRateAuditSupabase(supabase: any, currentService: any, payload: UpdateLaborServicePayload, oldRate: number): Promise<void> {
  if (payload.rate !== undefined && payload.rate !== oldRate) {
    const auditPayload = {
      service_id: currentService.id,
      service_code: currentService.code,
      old_rate: oldRate,
      new_rate: Number(payload.rate.toFixed(2)),
      reason: payload.reason?.trim() || 'Admin flat rate adjustment',
      user_name: payload.userName?.trim() || 'Service Desk Manager'
    };

    const { error: auditError } = await supabase
      .from('service_rate_audit_logs')
      .insert(auditPayload);

    if (auditError) {
      console.warn('[updateLaborServiceAction] Audit log error:', auditError.message);
    }
  }
}

async function executeSupabaseUpdateService(
  serviceId: string,
  payload: UpdateLaborServicePayload
): Promise<ServiceActionResult<LaborService> | null> {
  try {
    const { createClient, createAdminClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId);
    const { data: currentService } = await (isUuid
      ? supabase.from('labor_services').select('*').eq('id', serviceId).maybeSingle()
      : supabase.from('labor_services').select('*').eq('code', serviceId).maybeSingle());

    if (!currentService) return null;

    const oldRate = Number(currentService.rate);
    const updateData = buildServiceUpdateData(payload);

    let { data: updatedService, error: updateError } = await supabase
      .from('labor_services')
      .update(updateData)
      .eq('id', currentService.id)
      .select()
      .single();

    if (updateError && updateError.message.toLowerCase().includes('permission denied')) {
      const adminClient = createAdminClient();
      const retry = await adminClient
        .from('labor_services')
        .update(updateData)
        .eq('id', currentService.id)
        .select()
        .single();

      if (!retry.error && retry.data) {
        updatedService = retry.data;
        updateError = null;
      }
    }

    if (!updateError && updatedService) {
      await logServiceRateAuditSupabase(supabase, currentService, payload, oldRate);
      return { success: true, data: mapDbServiceToDomain(updatedService) };
    }
  } catch (err) {
    console.warn('[updateLaborServiceAction] Supabase error:', err);
  }
  return null;
}

async function executePrismaUpdateService(
  serviceId: string,
  payload: UpdateLaborServicePayload
): Promise<ServiceActionResult<LaborService> | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = getPrismaClient() as any;
    if (prisma?.laborService) {
      const currentService = await prisma.laborService.findFirst({
        where: { OR: [{ id: serviceId }, { code: serviceId }] }
      });

      if (!currentService) return null;

      const oldRate = Number(currentService.rate);
      const isRateChanged = payload.rate !== undefined && payload.rate !== oldRate;
      const updateData = buildServiceUpdateData(payload);

      const updated = await prisma.laborService.update({
        where: { id: currentService.id },
        data: updateData
      });

      if (isRateChanged && prisma.serviceRateAuditLog) {
        await prisma.serviceRateAuditLog.create({
          data: {
            serviceId: currentService.id,
            serviceCode: currentService.code,
            oldRate,
            newRate: Number(payload.rate!.toFixed(2)),
            reason: payload.reason?.trim() || 'Admin flat rate adjustment',
            userName: payload.userName?.trim() || 'Service Desk Manager'
          }
        });
      }

      return { success: true, data: mapDbServiceToDomain(updated) };
    }
  } catch (err) {
    console.warn('[updateLaborServiceAction] Prisma error:', err);
  }
  return null;
}

export async function updateLaborServiceAction(
  serviceId: string,
  payload: UpdateLaborServicePayload
): Promise<ServiceActionResult<LaborService>> {
  if (payload.rate !== undefined && (isNaN(payload.rate) || payload.rate <= 0)) {
    return {
      success: false,
      error: 'Flat labor rate must be greater than ₱0.00.',
      code: 'VALIDATION_ERROR',
      fieldErrors: { rate: 'Flat labor rate must be greater than ₱0.00.' }
    };
  }

  const supabaseResult = await executeSupabaseUpdateService(serviceId, payload);
  if (supabaseResult) {
    await safeRevalidatePaths();
    return supabaseResult;
  }

  const prismaResult = await executePrismaUpdateService(serviceId, payload);
  if (prismaResult) {
    await safeRevalidatePaths();
    return prismaResult;
  }

  const idx = memoryServices.findIndex(
    (s) => s.id === serviceId || s.code === serviceId
  );
  if (idx === -1) {
    return {
      success: false,
      error: `Labor service "${serviceId}" was not found.`,
      code: 'NOT_FOUND'
    };
  }

  const existing = memoryServices[idx];
  const oldRate = existing.rate;
  const isRateChanged = payload.rate !== undefined && payload.rate !== oldRate;

  const updated: LaborService = {
    ...existing,
    name: payload.name !== undefined ? payload.name.trim() : existing.name,
    bay: payload.bay !== undefined ? payload.bay.trim() : existing.bay,
    rate: payload.rate !== undefined ? Number(payload.rate.toFixed(2)) : existing.rate,
    duration: payload.duration !== undefined ? payload.duration.trim() : existing.duration,
    description: payload.description !== undefined ? payload.description.trim() || undefined : existing.description,
    active: payload.active !== undefined ? payload.active : existing.active,
    updatedAt: new Date()
  };

  memoryServices[idx] = updated;

  if (isRateChanged) {
    const auditEntry: ServiceRateAuditLog = {
      id: `audit-${Date.now()}`,
      serviceId: existing.id || existing.code,
      serviceCode: existing.code,
      oldRate,
      newRate: updated.rate,
      reason: payload.reason?.trim() || 'Admin flat rate adjustment',
      userName: payload.userName?.trim() || 'Service Desk Manager',
      createdAt: new Date().toISOString()
    };
    memoryAuditLogs.push(auditEntry);
  }

  await safeRevalidatePaths();
  return { success: true, data: updated };
}

export async function toggleServiceStatusAction(
  serviceId: string,
  active: boolean
): Promise<ServiceActionResult<LaborService>> {
  return updateLaborServiceAction(serviceId, { active });
}

export async function deleteLaborServiceAction(
  serviceId: string
): Promise<ServiceActionResult<{ id: string }>> {
  try {
    const { createClient, createAdminClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId);
    let { error: deleteError } = await (isUuid
      ? supabase.from('labor_services').delete().eq('id', serviceId)
      : supabase.from('labor_services').delete().eq('code', serviceId));

    if (deleteError && deleteError.message.toLowerCase().includes('permission denied')) {
      const adminClient = createAdminClient();
      const retry = await (isUuid
        ? adminClient.from('labor_services').delete().eq('id', serviceId)
        : adminClient.from('labor_services').delete().eq('code', serviceId));
      deleteError = retry.error;
    }

    if (!deleteError) {
      await safeRevalidatePaths();
      return { success: true, data: { id: serviceId } };
    }
  } catch (err) {
    console.warn('[deleteLaborServiceAction] Supabase delete error:', err);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = getPrismaClient() as any;
    if (prisma?.laborService) {
      await prisma.laborService.deleteMany({
        where: { OR: [{ id: serviceId }, { code: serviceId }] }
      });
      await safeRevalidatePaths();
      return { success: true, data: { id: serviceId } };
    }
  } catch (err) {
    console.warn('[deleteLaborServiceAction] Prisma delete error:', err);
  }

  const initialLength = memoryServices.length;
  memoryServices = memoryServices.filter(
    (s) => s.id !== serviceId && s.code !== serviceId
  );

  if (memoryServices.length === initialLength) {
    return {
      success: false,
      error: `Labor service "${serviceId}" was not found.`,
      code: 'NOT_FOUND'
    };
  }

  await safeRevalidatePaths();
  return { success: true, data: { id: serviceId } };
}

export async function getServiceRateAuditLogsAction(
  serviceId?: string
): Promise<ServiceRateAuditLog[]> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    let query = supabase
      .from('service_rate_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (serviceId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId);
      query = isUuid ? query.eq('service_id', serviceId) : query.eq('service_code', serviceId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        serviceId: d.service_id,
        serviceCode: d.service_code,
        oldRate: Number(d.old_rate),
        newRate: Number(d.new_rate),
        reason: d.reason || undefined,
        userName: d.user_name || 'Admin Manager',
        createdAt: d.created_at
      }));
    }
  } catch (err) {
    console.warn('[getServiceRateAuditLogsAction] Supabase error:', err);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = getPrismaClient() as any;
    if (prisma?.serviceRateAuditLog) {
      const logs = await prisma.serviceRateAuditLog.findMany({
        where: serviceId ? { serviceId } : undefined,
        orderBy: { createdAt: 'desc' }
      });

      if (logs && logs.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return logs.map((l: any) => ({
          id: l.id,
          serviceId: l.serviceId,
          serviceCode: l.serviceCode,
          oldRate: Number(l.oldRate),
          newRate: Number(l.newRate),
          reason: l.reason || undefined,
          userName: l.userName || 'Admin Manager',
          createdAt: l.createdAt.toISOString()
        }));
      }
    }
  } catch (err) {
    console.warn('[getServiceRateAuditLogsAction] Prisma error:', err);
  }

  return serviceId
    ? memoryAuditLogs.filter((l) => l.serviceId === serviceId)
    : memoryAuditLogs;
}
