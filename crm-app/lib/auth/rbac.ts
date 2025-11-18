/**
 * Role-Based Access Control (RBAC) Utilities
 *
 * Provides comprehensive RBAC functionality including:
 * - Permission checking
 * - Role management
 * - Permission caching
 * - Hierarchical permissions
 */

import { createClient } from '@/lib/supabase';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  category?: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  isSystemRole: boolean;
  isActive: boolean;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  role: Role;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  scope?: Record<string, any>;
}

// Permission cache (in-memory for performance)
const permissionCache = new Map<string, Set<string>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

/**
 * Clear permission cache for a user
 */
export function clearUserPermissionCache(userId: string): void {
  permissionCache.delete(userId);
  cacheTimestamps.delete(userId);
}

/**
 * Check if permission cache is valid
 */
function isCacheValid(userId: string): boolean {
  const timestamp = cacheTimestamps.get(userId);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Get all permissions for a user (with caching)
 */
export async function getUserPermissions(
  userId: string,
  useCache: boolean = true
): Promise<Set<string>> {
  // Check cache first
  if (useCache && isCacheValid(userId)) {
    const cached = permissionCache.get(userId);
    if (cached) return cached;
  }

  const supabase = createClient();

  // Get user's roles with permissions
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      id,
      role_id,
      is_active,
      expires_at,
      roles (
        id,
        name,
        is_active
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (rolesError || !userRoles) {
    console.error('Error fetching user roles:', rolesError);
    return new Set();
  }

  // Filter active, non-expired roles
  const activeRoleIds = userRoles
    .filter((ur) => {
      const role = ur.roles as any;
      if (!role || !role.is_active) return false;
      if (ur.expires_at && new Date(ur.expires_at) < new Date()) return false;
      return true;
    })
    .map((ur) => ur.role_id);

  if (activeRoleIds.length === 0) {
    return new Set();
  }

  // Get permissions for these roles
  const { data: rolePermissions, error: permsError } = await supabase
    .from('role_permissions')
    .select(`
      permission_id,
      permissions (
        name
      )
    `)
    .in('role_id', activeRoleIds);

  if (permsError || !rolePermissions) {
    console.error('Error fetching role permissions:', permsError);
    return new Set();
  }

  // Extract permission names
  const permissions = new Set<string>();
  rolePermissions.forEach((rp) => {
    const perm = rp.permissions as any;
    if (perm && perm.name) {
      permissions.add(perm.name);
    }
  });

  // Update cache
  permissionCache.set(userId, permissions);
  cacheTimestamps.set(userId, Date.now());

  return permissions;
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.has(permissionName);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissionNames: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissionNames.some((perm) => permissions.has(perm));
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissionNames: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissionNames.every((perm) => permissions.has(perm));
}

/**
 * Check if user has permission for a resource and action
 */
export async function canPerformAction(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const permissionName = `${resource}.${action}`;
  return hasPermission(userId, permissionName);
}

/**
 * Get user's roles
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      id,
      user_id,
      role_id,
      assigned_at,
      expires_at,
      is_active,
      scope,
      roles (
        id,
        name,
        display_name,
        description,
        level,
        is_system_role,
        is_active
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !data) {
    console.error('Error fetching user roles:', error);
    return [];
  }

  return data.map((ur) => {
    const role = ur.roles as any;
    return {
      id: ur.id,
      userId: ur.user_id,
      roleId: ur.role_id,
      role: {
        id: role.id,
        name: role.name,
        displayName: role.display_name,
        description: role.description,
        level: role.level,
        isSystemRole: role.is_system_role,
        isActive: role.is_active,
      },
      assignedAt: new Date(ur.assigned_at),
      expiresAt: ur.expires_at ? new Date(ur.expires_at) : undefined,
      isActive: ur.is_active,
      scope: ur.scope,
    };
  });
}

/**
 * Get highest role level for a user
 */
export async function getUserMaxRoleLevel(userId: string): Promise<number> {
  const roles = await getUserRoles(userId);
  if (roles.length === 0) return 0;
  return Math.max(...roles.map((r) => r.role.level));
}

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.some((r) => r.role.name === roleName);
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return hasAnyPermission(userId, ['super_admin', 'admin'].map((r) => `${r}.*`)) ||
    hasRole(userId, 'super_admin') ||
    hasRole(userId, 'admin');
}

/**
 * Assign role to user
 */
export async function assignRole(
  userId: string,
  roleId: string,
  assignedBy?: string,
  expiresAt?: Date,
  scope?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Check if role exists and is active
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .eq('is_active', true)
    .single();

  if (roleError || !role) {
    return { success: false, error: 'Role not found or inactive' };
  }

  // Check if user already has this role
  const { data: existing } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role_id', roleId)
    .single();

  if (existing) {
    return { success: false, error: 'User already has this role' };
  }

  // Assign role
  const { error: insertError } = await supabase.from('user_roles').insert({
    user_id: userId,
    role_id: roleId,
    assigned_by: assignedBy,
    expires_at: expiresAt?.toISOString(),
    scope: scope,
    is_active: true,
  });

  if (insertError) {
    console.error('Error assigning role:', insertError);
    return { success: false, error: 'Failed to assign role' };
  }

  // Clear permission cache
  clearUserPermissionCache(userId);

  return { success: true };
}

/**
 * Remove role from user
 */
export async function removeRole(
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('user_roles')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('role_id', roleId);

  if (error) {
    console.error('Error removing role:', error);
    return { success: false, error: 'Failed to remove role' };
  }

  // Clear permission cache
  clearUserPermissionCache(userId);

  return { success: true };
}

/**
 * Get all available roles
 */
export async function getAllRoles(): Promise<Role[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('is_active', true)
    .order('level', { ascending: false });

  if (error || !data) {
    console.error('Error fetching roles:', error);
    return [];
  }

  return data.map((r) => ({
    id: r.id,
    name: r.name,
    displayName: r.display_name,
    description: r.description,
    level: r.level,
    isSystemRole: r.is_system_role,
    isActive: r.is_active,
  }));
}

/**
 * Get all available permissions
 */
export async function getAllPermissions(): Promise<Permission[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('category', { ascending: true })
    .order('resource', { ascending: true });

  if (error || !data) {
    console.error('Error fetching permissions:', error);
    return [];
  }

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    resource: p.resource,
    action: p.action,
    description: p.description,
    category: p.category,
  }));
}

/**
 * Get permissions for a role
 */
export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('role_permissions')
    .select(`
      permissions (
        id,
        name,
        resource,
        action,
        description,
        category
      )
    `)
    .eq('role_id', roleId);

  if (error || !data) {
    console.error('Error fetching role permissions:', error);
    return [];
  }

  return data.map((rp) => {
    const p = rp.permissions as any;
    return {
      id: p.id,
      name: p.name,
      resource: p.resource,
      action: p.action,
      description: p.description,
      category: p.category,
    };
  });
}

/**
 * Require permission middleware helper
 */
export function requirePermission(permissionName: string) {
  return async (userId: string): Promise<boolean> => {
    return hasPermission(userId, permissionName);
  };
}

/**
 * Require any permission middleware helper
 */
export function requireAnyPermission(permissionNames: string[]) {
  return async (userId: string): Promise<boolean> => {
    return hasAnyPermission(userId, permissionNames);
  };
}

/**
 * Require all permissions middleware helper
 */
export function requireAllPermissions(permissionNames: string[]) {
  return async (userId: string): Promise<boolean> => {
    return hasAllPermissions(userId, permissionNames);
  };
}

/**
 * Permission decorator for API routes
 */
export interface PermissionCheckResult {
  hasAccess: boolean;
  missingPermissions?: string[];
}

export async function checkPermissions(
  userId: string,
  requiredPermissions: string[]
): Promise<PermissionCheckResult> {
  const userPermissions = await getUserPermissions(userId);
  const missingPermissions = requiredPermissions.filter(
    (perm) => !userPermissions.has(perm)
  );

  return {
    hasAccess: missingPermissions.length === 0,
    missingPermissions: missingPermissions.length > 0 ? missingPermissions : undefined,
  };
}
