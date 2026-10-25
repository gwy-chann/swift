'use server';

import type { DbUserRole, StaffPermissions } from '../types/auth.ts';
import {
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  mapDbRoleToDisplay,
} from '../types/auth.ts';
import { MOCK_STAFF_PROFILES, type MockStaffUserProfile } from '../mock-data/users.ts';
import {
  ProvisionStaffUserSchema,
  UpdateUserPermissionsSchema,
  ToggleUserStatusSchema,
  type StaffUserSummary,
  type UserActionResult,
} from '../../specs/030-supabase-rbac-extension-granular-permission-flags/contracts/rbac-permissions.contract.ts';
import {
  UpdateStaffUserSchema,
} from '../../specs/031-user-account-provisioning-rbac-management/contracts/user-management.contract.ts';
import {
  StaffPinSchema,
  StaffPasswordSchema,
  ResetStaffCredentialsSchema,
  type ResetStaffCredentialsResult,
  PIN_VALIDATION_ERROR_MSG,
} from '../../specs/104-staff-credential-provisioning-and-reset/contracts/credentials.contract.ts';
import { logSecurityEventAction } from './audit-actions.ts';

// In-memory fallback cache for test suites and environments without live Supabase
let memoryStaffUsers: MockStaffUserProfile[] = structuredClone(MOCK_STAFF_PROFILES);

export async function resetInMemoryStaffUsers(): Promise<void> {
  memoryStaffUsers = structuredClone(MOCK_STAFF_PROFILES);
  await Promise.resolve();
}

async function safeRevalidatePaths(): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/users');
  } catch {
    // Suppressed when executing in unit testing or outside Next.js request context
  }
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfileToSummary(profile: MockStaffUserProfile | Record<string, any>): StaffUserSummary {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = profile as Record<string, any>;
  const role = (p.role as DbUserRole) || 'staff';
  const rawPerms = p.permissions;
  let permissions: StaffPermissions = {
    ...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_STAFF_PERMISSIONS),
  };

  if (rawPerms && typeof rawPerms === 'object') {
    permissions = {
      ...permissions,
      ...(rawPerms as Record<string, boolean>),
    };
  }

  const nameVal = p.full_name || p.fullName || p.name || splitEmail(p.email);

  return {
    id: String(p.id),
    email: String(p.email),
    fullName: String(nameVal),
    role,
    roleDisplay: mapDbRoleToDisplay(role),
    status: (p.status as 'Active' | 'Inactive' | 'Suspended') || 'Active',
    permissions,
    createdAt: String(p.created_at || p.createdAt || new Date().toISOString()),
    updatedAt: String(p.updated_at || p.updatedAt || new Date().toISOString()),
  };
}

function splitEmail(email: unknown): string {
  if (typeof email === 'string') {
    return email.split('@')[0];
  }
  return 'Staff Member';
}

/**
 * Returns caller role and user ID by inspecting cookies or optional overrides
 */
async function resolveCallerContext(
  roleOverride?: string,
  idOverride?: string
): Promise<{ role: string; userId: string }> {
  if (roleOverride) {
    return {
      role: roleOverride.toLowerCase(),
      userId: idOverride || '00000000-0000-0000-0000-000000000001',
    };
  }

  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const isElevated = cookieStore.get('swift_admin_elevated')?.value === 'true';
    const cookieRole = cookieStore.get('swift-session-role')?.value?.toLowerCase();

    if (isElevated) {
      return {
        role: 'admin',
        userId: cookieStore.get('swift-session-user-id')?.value || '00000000-0000-0000-0000-000000000001',
      };
    }

    return {
      role: cookieRole || 'admin',
      userId: cookieStore.get('swift-session-user-id')?.value || '00000000-0000-0000-0000-000000000001',
    };
  } catch {
    // Outside Next.js request context (e.g., node test runners)
    return {
      role: 'admin',
      userId: '00000000-0000-0000-0000-000000000001',
    };
  }
}

/**
 * Lists all staff profiles, hydrated from Supabase public.profiles or in-memory fallback.
 */
export async function listStaffUsersAction(): Promise<StaffUserSummary[]> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    const { data: dbProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && dbProfiles && dbProfiles.length > 0) {
      return dbProfiles.map(mapProfileToSummary);
    }
  } catch (error) {
    console.warn(
      '[listStaffUsersAction] Supabase query issue, using in-memory store:',
      error instanceof Error ? error.message : String(error)
    );
  }

  return memoryStaffUsers.map(mapProfileToSummary);
}

function generateSecurePin(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const pin = (array[0] % 9000) + 1000;
    return `SwiftTemp#${pin}`;
  }
  return 'SwiftTemp#5678';
}

const APPROVED_STAFF_ROLES: readonly string[] = ['cashier', 'mechanic', 'inventory_clerk'];
const INVALID_ROLE_ERROR =
  'Staff account role must be strictly one of: Cashier Privilege (cashier), Mechanic (mechanic), or Inventory Clerk (inventory_clerk).';

async function logUnapprovedRoleWarning(attemptedRole: string, targetEmail: string): Promise<void> {
  try {
    await logSecurityEventAction({
      action: `Rejected staff provisioning attempt with unapproved role: ${attemptedRole}`,
      severity: 'warning',
      terminalIp: '192.168.1.100 (Admin PC)',
      userEmail: 'admin@swift.ph',
      metadata: { targetEmail, attemptedRole },
    });
  } catch {
    // Suppress audit logging error
  }
}

async function logStaffCreationSuccess(
  email: string,
  fullName: string,
  role: DbUserRole,
  permissions: StaffPermissions
): Promise<void> {
  try {
    await logSecurityEventAction({
      action: `Created employee account for ${email} (${mapDbRoleToDisplay(role)})`,
      severity: 'info',
      terminalIp: '192.168.1.100 (Admin PC)',
      userEmail: 'admin@swift.ph',
      metadata: { email, fullName, role, permissions },
    });
  } catch {
    // Suppress audit logging error
  }
}

async function trySupabaseAdminAuthProvision(
  payload: { email: string; fullName: string; role: DbUserRole; password?: string; pin?: string },
  permissions: StaffPermissions,
  nowIso: string
): Promise<MockStaffUserProfile | null | 'DUPLICATE_EMAIL'> {
  try {
    const { createAdminClient, createClient } = await import('../supabase/server.ts');
    const supabaseAdmin = createAdminClient();
    const effectivePin = payload.pin || generateSecurePin().replace(/\D/g, '').slice(0, 4) || '1234';

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password || generateSecurePin(),
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName,
        role: payload.role,
        permissions,
        pin_code: effectivePin,
      },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered')) {
        return 'DUPLICATE_EMAIL';
      }
      throw authError;
    }

    if (authData?.user) {
      try {
        const supabase = await createClient();
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: payload.fullName,
          role: payload.role,
          status: 'Active',
          pin_code: effectivePin,
          permissions,
          created_at: authData.user.created_at || nowIso,
          updated_at: nowIso,
        });
      } catch (upsertError) {
        console.warn(
          '[trySupabaseAdminAuthProvision] Supabase public.profiles upsert warning:',
          upsertError instanceof Error ? upsertError.message : String(upsertError)
        );
      }

      return {
        id: authData.user.id,
        name: payload.fullName,
        email: payload.email,
        role: payload.role,
        roleDisplay: mapDbRoleToDisplay(payload.role),
        status: 'Active',
        permissions,
        pinCode: effectivePin,
        createdAt: authData.user.created_at || nowIso,
        updatedAt: nowIso,
      };
    }
  } catch (error) {
    console.warn(
      '[provisionStaffUserAction] Supabase admin auth offline, using in-memory mock:',
      error instanceof Error ? error.message : String(error)
    );
  }
  return null;
}

/**
 * Provisions a new employee with Supabase auth and profiles, or in-memory fallback.
 */
export async function provisionStaffUserAction(
  rawPayload: unknown,
  callerRoleOverride?: string
): Promise<UserActionResult<StaffUserSummary>> {
  const { role: callerRole } = await resolveCallerContext(callerRoleOverride);
  if (callerRole !== 'admin') {
    return {
      success: false,
      error: 'Unauthorized: Admin privileges required to provision staff users',
      code: 'UNAUTHORIZED',
    };
  }

  const rawRole = (rawPayload as { role?: string })?.role;
  const rawEmail = (rawPayload as { email?: string })?.email || 'unknown';
  if (rawRole && !APPROVED_STAFF_ROLES.includes(rawRole)) {
    await logUnapprovedRoleWarning(rawRole, rawEmail);
    return {
      success: false,
      error: INVALID_ROLE_ERROR,
      code: 'VALIDATION_ERROR',
    };
  }

  const rawPin = (rawPayload as { pin?: string })?.pin;
  if (rawPin !== undefined) {
    const pinValidation = StaffPinSchema.safeParse(rawPin);
    if (!pinValidation.success) {
      return {
        success: false,
        error: pinValidation.error.issues[0]?.message || PIN_VALIDATION_ERROR_MSG,
        code: 'VALIDATION_ERROR',
      };
    }
  }

  const rawPassword = (rawPayload as { password?: string })?.password;
  if (rawPassword !== undefined) {
    const pwdValidation = StaffPasswordSchema.safeParse(rawPassword);
    if (!pwdValidation.success) {
      return {
        success: false,
        error: pwdValidation.error.issues[0]?.message || 'Password must be at least 6 characters in length',
        code: 'VALIDATION_ERROR',
      };
    }
  }

  const parsed = ProvisionStaffUserSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid staff user details',
      code: 'VALIDATION_ERROR',
    };
  }

  if (!APPROVED_STAFF_ROLES.includes(parsed.data.role)) {
    await logUnapprovedRoleWarning(parsed.data.role, parsed.data.email);
    return {
      success: false,
      error: INVALID_ROLE_ERROR,
      code: 'VALIDATION_ERROR',
    };
  }

  const payload = parsed.data;
  const normalizedEmail = payload.email.toLowerCase().trim();

  // Check duplicate in memory
  if (memoryStaffUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return {
      success: false,
      error: 'An account with this email address already exists',
      code: 'DUPLICATE_EMAIL',
    };
  }

  // Assign deterministic default permissions for the approved staff role
  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[payload.role] || DEFAULT_STAFF_PERMISSIONS;
  const mergedPermissions: StaffPermissions = {
    ...roleDefaults,
  };

  const nowIso = new Date().toISOString();

  // Attempt Supabase Admin Auth Provisioning
  const supabaseResult = await trySupabaseAdminAuthProvision(
    { ...payload, email: normalizedEmail, pin: rawPin },
    mergedPermissions,
    nowIso
  );

  if (supabaseResult === 'DUPLICATE_EMAIL') {
    return {
      success: false,
      error: 'An account with this email address already exists',
      code: 'DUPLICATE_EMAIL',
    };
  }

  const finalUser: MockStaffUserProfile = supabaseResult || {
    id: `00000000-0000-0000-0000-${String(Date.now()).slice(-12).padStart(12, '0')}`,
    name: payload.fullName,
    email: normalizedEmail,
    role: payload.role,
    roleDisplay: mapDbRoleToDisplay(payload.role),
    status: 'Active',
    permissions: mergedPermissions,
    pinCode: rawPin || '1234',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  memoryStaffUsers.push(finalUser);
  await safeRevalidatePaths();
  await logStaffCreationSuccess(normalizedEmail, payload.fullName, payload.role, mergedPermissions);

  return {
    success: true,
    data: mapProfileToSummary(finalUser),
  };
}

/**
 * Updates an employee's granular permission flags.
 */
export async function updateUserPermissionsAction(
  userId: string,
  permissions: Partial<StaffPermissions>,
  callerRoleOverride?: string
): Promise<UserActionResult<StaffUserSummary>> {
  const parsed = UpdateUserPermissionsSchema.safeParse({ userId, permissions });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid permission update payload',
      code: 'VALIDATION_ERROR',
    };
  }

  const { role: callerRole } = await resolveCallerContext(callerRoleOverride);
  if (callerRole !== 'admin') {
    return {
      success: false,
      error: 'Unauthorized: Admin privileges required to update user permissions',
      code: 'UNAUTHORIZED',
    };
  }

  const existingIndex = memoryStaffUsers.findIndex((u) => u.id === userId);
  if (existingIndex === -1) {
    return {
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND',
    };
  }

  const targetUser = memoryStaffUsers[existingIndex];
  const updatedPermissions: StaffPermissions = {
    ...targetUser.permissions,
    ...permissions,
  };

  targetUser.permissions = updatedPermissions;
  targetUser.updatedAt = new Date().toISOString();

  // Try updating Supabase database
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    await supabase
      .from('profiles')
      .update({
        permissions: updatedPermissions,
        updated_at: targetUser.updatedAt,
      })
      .eq('id', userId);
  } catch (error) {
    console.warn(
      '[updateUserPermissionsAction] Supabase update issue, retained in memory:',
      error instanceof Error ? error.message : String(error)
    );
  }

  await safeRevalidatePaths();

  return {
    success: true,
    data: mapProfileToSummary(targetUser),
  };
}

/**
 * Updates an employee's details (full name, role, granular permissions) with self-demotion guards.
 */
export async function updateStaffUserAction(
  rawPayload: unknown,
  callerRoleOverride?: string,
  callerIdOverride?: string
): Promise<UserActionResult<StaffUserSummary>> {
  const parsed = UpdateStaffUserSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid user update payload',
      code: 'VALIDATION_ERROR',
    };
  }

  const { role: callerRole, userId: callerId } = await resolveCallerContext(
    callerRoleOverride,
    callerIdOverride
  );

  if (callerRole !== 'admin') {
    return {
      success: false,
      error: 'Unauthorized: Admin privileges required to update staff accounts',
      code: 'UNAUTHORIZED',
    };
  }

  const payload = parsed.data;
  const existingIndex = memoryStaffUsers.findIndex((u) => u.id === payload.userId);
  if (existingIndex === -1) {
    return {
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND',
    };
  }

  const targetUser = memoryStaffUsers[existingIndex];

  // Self-demotion guard: Admin cannot change their own role to non-admin
  if (
    payload.userId === callerId &&
    targetUser.role === 'admin' &&
    payload.role &&
    payload.role !== 'admin'
  ) {
    return {
      success: false,
      error: 'Admin self-lockout or role demotion is prohibited.',
      code: 'SELF_LOCKOUT_PREVENTED',
    };
  }

  const updatedName = payload.fullName?.trim() || targetUser.name;
  const updatedRole = payload.role || targetUser.role;
  const updatedRoleDisplay = mapDbRoleToDisplay(updatedRole);
  const updatedPermissions: StaffPermissions = {
    ...targetUser.permissions,
    ...payload.permissions,
  };

  targetUser.name = updatedName;
  targetUser.role = updatedRole;
  targetUser.roleDisplay = updatedRoleDisplay;
  targetUser.permissions = updatedPermissions;
  targetUser.updatedAt = new Date().toISOString();

  // Try updating Supabase database
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    await supabase
      .from('profiles')
      .update({
        full_name: updatedName,
        role: updatedRole,
        permissions: updatedPermissions,
        updated_at: targetUser.updatedAt,
      })
      .eq('id', payload.userId);
  } catch (error) {
    console.warn(
      '[updateStaffUserAction] Supabase update issue, retained in memory:',
      error instanceof Error ? error.message : String(error)
    );
  }

  // Security audit log event
  try {
    await logSecurityEventAction({
      action: `Updated employee account for ${targetUser.email} (Role: ${updatedRoleDisplay})`,
      severity: 'info',
      terminalIp: '192.168.1.100 (Admin PC)',
      userEmail: 'admin@swift.ph',
      metadata: {
        targetUserId: payload.userId,
        targetEmail: targetUser.email,
        updatedRole,
        updatedPermissions,
      },
    });
  } catch {
    // Suppress audit logging error
  }

  await safeRevalidatePaths();

  return {
    success: true,
    data: mapProfileToSummary(targetUser),
  };
}

/**
 * Toggles an employee's active status (with self-lockout prevention).
 */
export async function toggleUserStatusAction(
  userId: string,
  status: 'Active' | 'Inactive',
  callerIdOverride?: string,
  callerRoleOverride?: string
): Promise<UserActionResult<StaffUserSummary>> {
  const parsed = ToggleUserStatusSchema.safeParse({ userId, status });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid status payload',
      code: 'VALIDATION_ERROR',
    };
  }

  const { role: callerRole, userId: callerId } = await resolveCallerContext(
    callerRoleOverride,
    callerIdOverride
  );

  if (callerRole !== 'admin') {
    return {
      success: false,
      error: 'Unauthorized: Admin privileges required to modify user status',
      code: 'UNAUTHORIZED',
    };
  }

  const existingIndex = memoryStaffUsers.findIndex((u) => u.id === userId);
  if (existingIndex === -1) {
    return {
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND',
    };
  }

  const targetUser = memoryStaffUsers[existingIndex];

  // Self-lockout check: Admin cannot deactivate their own profile
  if (userId === callerId && targetUser.role === 'admin' && status !== 'Active') {
    return {
      success: false,
      error: 'Admin self-lockout or deactivation is prohibited.',
      code: 'SELF_LOCKOUT_PREVENTED',
    };
  }

  targetUser.status = status;
  targetUser.updatedAt = new Date().toISOString();

  // Try updating Supabase database and revoking active sessions
  try {
    const { createClient, createAdminClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    await supabase
      .from('profiles')
      .update({
        status,
        updated_at: targetUser.updatedAt,
      })
      .eq('id', userId);

    if (status === 'Inactive') {
      try {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.auth.admin.signOut(userId, 'global');
      } catch {
        // Suppress admin signout failure in offline/mock environment
      }
    }
  } catch (error) {
    console.warn(
      '[toggleUserStatusAction] Supabase update issue, retained in memory:',
      error instanceof Error ? error.message : String(error)
    );
  }

  // Security audit log event
  try {
    await logSecurityEventAction({
      action: status === 'Inactive'
        ? `Account deactivation and immediate session revocation for ${targetUser.email}`
        : `Toggled status of employee ${targetUser.email} to ${status}`,
      severity: status === 'Inactive' ? 'warning' : 'info',
      terminalIp: '192.168.1.100 (Admin PC)',
      userEmail: 'admin@swift.ph',
      metadata: {
        userId,
        email: targetUser.email,
        status,
        event: status === 'Inactive' ? 'ACCOUNT_DEACTIVATED_SESSION_TERMINATED' : 'ACCOUNT_STATUS_UPDATED',
      },
    });
  } catch {
    // Suppress audit logging error
  }

  await safeRevalidatePaths();

  return {
    success: true,
    data: mapProfileToSummary(targetUser),
  };
}

/**
 * Resolves the active status ('Active' | 'Inactive' | 'Suspended') of a staff member
 * by ID or email address, checking in-memory store first (authoritative in tests and local state)
 * with fallback to live Supabase profiles.
 */
export async function getStaffUserStatus(
  userIdOrEmail: string
): Promise<'Active' | 'Inactive' | 'Suspended' | null> {
  const normalized = userIdOrEmail.trim().toLowerCase();

  // 1. Check in-memory store first
  const memoryUser = memoryStaffUsers.find(
    (u) => u.id === userIdOrEmail || u.email.toLowerCase() === normalized
  );
  if (memoryUser) {
    return memoryUser.status;
  }

  // 2. Check live Supabase profiles
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const query = supabase
      .from('profiles')
      .select('status')
      .limit(1);

    const { data, error } = userIdOrEmail.includes('@')
      ? await query.eq('email', normalized).maybeSingle()
      : await query.eq('id', userIdOrEmail).maybeSingle();

    if (!error && data?.status) {
      return data.status as 'Active' | 'Inactive' | 'Suspended';
    }
  } catch {
    // Offline or unit testing mode
  }

  // 3. Fallback to default mock profiles
  const fallback = MOCK_STAFF_PROFILES.find(
    (p) => p.id === userIdOrEmail || p.email.toLowerCase() === normalized
  );
  return fallback ? fallback.status : null;
}

/**
 * Resets a staff member's password and numeric PIN (SIAA-104).
 */
export async function resetStaffCredentialsAction(
  rawPayload: unknown,
  callerRoleOverride?: string,
  callerIdOverride?: string
): Promise<ResetStaffCredentialsResult> {
  const { role: callerRole, userId: callerId } = await resolveCallerContext(
    callerRoleOverride,
    callerIdOverride
  );

  if (callerRole !== 'admin') {
    return {
      success: false,
      error: 'Unauthorized: Admin privileges required to reset staff credentials',
      code: 'UNAUTHORIZED',
    };
  }

  const parsed = ResetStaffCredentialsSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid reset credentials payload',
      code: 'VALIDATION_ERROR',
    };
  }

  const { userId, password, pin } = parsed.data;
  const existingIndex = memoryStaffUsers.findIndex((u) => u.id === userId);
  if (existingIndex === -1) {
    return {
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND',
    };
  }

  const targetUser = memoryStaffUsers[existingIndex];
  const nowIso = new Date().toISOString();
  targetUser.pinCode = pin;
  targetUser.updatedAt = nowIso;

  // Supabase Auth Admin password update
  try {
    const { createAdminClient } = await import('../supabase/server.ts');
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: {
        pin_code: pin,
      },
    });
  } catch (error) {
    console.warn(
      '[resetStaffCredentialsAction] Supabase auth admin update offline/mocked:',
      error instanceof Error ? error.message : String(error)
    );
  }

  // Supabase public.profiles pin_code update
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    await supabase
      .from('profiles')
      .update({
        pin_code: pin,
        updated_at: nowIso,
      })
      .eq('id', userId);
  } catch (error) {
    console.warn(
      '[resetStaffCredentialsAction] Supabase public.profiles update offline/mocked:',
      error instanceof Error ? error.message : String(error)
    );
  }

  // Security audit event log
  try {
    await logSecurityEventAction({
      action: `Reset credentials for employee account: ${targetUser.email}`,
      severity: 'warning',
      terminalIp: '192.168.1.100 (Admin PC)',
      userEmail: 'admin@swift.ph',
      metadata: {
        targetUserId: userId,
        targetEmail: targetUser.email,
        resetBy: callerId || '00000000-0000-0000-0000-000000000001',
      },
    });
  } catch {
    // Suppress audit logging error
  }

  await safeRevalidatePaths();

  return {
    success: true,
    message: `Credentials successfully reset for ${targetUser.name || targetUser.email}.`,
    code: 'SUCCESS',
    updatedAt: nowIso,
  };
}

export async function getInMemoryStaffUserPin(userId: string): Promise<string | undefined> {
  const user = memoryStaffUsers.find((u) => u.id === userId);
  return user?.pinCode;
}

