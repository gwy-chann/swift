'use server';

import { getPrismaClient } from '../prisma.ts';
import type { LaborService } from '../types/service.ts';
import { MOCK_SERVICES } from '../mock-data/services.ts';

/**
 * Server action to retrieve all active workshop labor services.
 * Queries PostgreSQL via Supabase client with ascending code sorting,
 * falling back to Prisma ORM and MOCK_SERVICES if the database is unreachable.
 *
 * @returns {Promise<LaborService[]>} Array of active LaborService entities
 */
export async function getLaborServicesAction(): Promise<LaborService[]> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const { data: dbServices, error } = await supabase
      .from('labor_services')
      .select('*')
      .eq('active', true)
      .order('code', { ascending: true });

    if (!error && dbServices && dbServices.length > 0) {
      return dbServices.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        bay: s.bay,
        rate: Number(s.rate),
        duration: s.duration,
        description: s.description || undefined,
        active: Boolean(s.active),
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));
    }
  } catch (error) {
    console.warn(
      '[getLaborServicesAction] Supabase query encountered issue, trying Prisma fallback:',
      error instanceof Error ? error.message : String(error)
    );
  }

  // Fallback to Prisma ORM
  try {
    interface PrismaLaborServiceRecord {
      id: string;
      code: string;
      name: string;
      bay: string;
      rate: { toString(): string } | number;
      duration: string;
      description: string | null;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    }

    const prisma = getPrismaClient() as {
      laborService?: {
        findMany(args: {
          where: { active: boolean };
          orderBy: { code: 'asc' | 'desc' };
        }): Promise<PrismaLaborServiceRecord[]>;
      };
    } | null;

    if (prisma?.laborService) {
      const prismaServices = await prisma.laborService.findMany({
        where: { active: true },
        orderBy: { code: 'asc' }
      });

      if (prismaServices && prismaServices.length > 0) {
        return prismaServices.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          bay: s.bay,
          rate: Number(s.rate),
          duration: s.duration,
          description: s.description || undefined,
          active: Boolean(s.active),
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }));
      }
    }
  } catch (prismaError) {
    console.warn(
      '[getLaborServicesAction] Prisma fallback query encountered issue:',
      prismaError instanceof Error ? prismaError.message : String(prismaError)
    );
  }

  // Return canonical baseline mock services
  return MOCK_SERVICES;
}
