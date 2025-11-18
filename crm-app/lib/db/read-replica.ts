/**
 * Read Replica Configuration for CRM Application
 *
 * This module provides support for read replicas to offload reporting
 * and analytical queries from the primary database.
 *
 * Usage:
 * - Use `getReplicaClient()` for read-only queries (reports, dashboards, analytics)
 * - Use regular `supabase` client for write operations and real-time features
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Read replica configuration
const REPLICA_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_READ_REPLICA === 'true',
  url: process.env.NEXT_PUBLIC_SUPABASE_REPLICA_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_REPLICA_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  // Fallback to primary if replica is unavailable
  fallbackToPrimary: process.env.READ_REPLICA_FALLBACK === 'true',
  // Health check interval (ms)
  healthCheckInterval: parseInt(process.env.READ_REPLICA_HEALTH_CHECK_INTERVAL || '30000'),
}

// Replica client instance
let replicaClient: SupabaseClient | null = null
let replicaHealthy = true
let lastHealthCheck = 0

/**
 * Initialize read replica client
 */
function initializeReplicaClient(): SupabaseClient {
  if (!replicaClient && REPLICA_CONFIG.enabled) {
    replicaClient = createClient(
      REPLICA_CONFIG.url!,
      REPLICA_CONFIG.anonKey!,
      {
        auth: {
          persistSession: false, // Read replicas don't need session persistence
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-replica-read': 'true', // Custom header to identify replica queries
          },
        },
      }
    )
  }
  return replicaClient!
}

/**
 * Check if read replica is healthy
 */
async function checkReplicaHealth(): Promise<boolean> {
  if (!REPLICA_CONFIG.enabled || !replicaClient) {
    return false
  }

  const now = Date.now()
  // Skip health check if recently performed
  if (now - lastHealthCheck < REPLICA_CONFIG.healthCheckInterval) {
    return replicaHealthy
  }

  try {
    // Simple health check query
    const { error } = await replicaClient
      .from('clients')
      .select('id')
      .limit(1)
      .single()

    lastHealthCheck = now
    replicaHealthy = !error || error.code === 'PGRST116' // PGRST116 = no rows, which is fine
    return replicaHealthy
  } catch (error) {
    console.error('Read replica health check failed:', error)
    lastHealthCheck = now
    replicaHealthy = false
    return false
  }
}

/**
 * Get read replica client for read-only queries
 *
 * @param options Configuration options
 * @returns Supabase client (replica or primary based on configuration)
 */
export async function getReplicaClient(options?: {
  forcePrimary?: boolean
  skipHealthCheck?: boolean
}): Promise<SupabaseClient> {
  const { forcePrimary = false, skipHealthCheck = false } = options || {}

  // Return primary client if replica is disabled or forced
  if (!REPLICA_CONFIG.enabled || forcePrimary) {
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // Initialize replica client if needed
  if (!replicaClient) {
    initializeReplicaClient()
  }

  // Check health if not skipped
  if (!skipHealthCheck) {
    const healthy = await checkReplicaHealth()

    // Fallback to primary if replica is unhealthy
    if (!healthy && REPLICA_CONFIG.fallbackToPrimary) {
      console.warn('Read replica unhealthy, falling back to primary database')
      const { createClient } = await import('@supabase/supabase-js')
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
  }

  return replicaClient!
}

/**
 * Check if read replica is enabled and healthy
 */
export async function isReplicaAvailable(): Promise<boolean> {
  if (!REPLICA_CONFIG.enabled) {
    return false
  }
  return await checkReplicaHealth()
}

/**
 * Get configuration status
 */
export function getReplicaConfig() {
  return {
    enabled: REPLICA_CONFIG.enabled,
    healthy: replicaHealthy,
    lastHealthCheck: lastHealthCheck > 0 ? new Date(lastHealthCheck) : null,
    fallbackEnabled: REPLICA_CONFIG.fallbackToPrimary,
  }
}

/**
 * Query routing helper
 * Automatically routes queries to replica for read operations
 */
export class QueryRouter {
  private primaryClient: SupabaseClient
  private replicaEnabled: boolean

  constructor(primaryClient: SupabaseClient) {
    this.primaryClient = primaryClient
    this.replicaEnabled = REPLICA_CONFIG.enabled
  }

  /**
   * Execute read query (uses replica if available)
   */
  async read<T = any>(
    table: string,
    query: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> {
    if (this.replicaEnabled) {
      const replica = await getReplicaClient()
      return await query(replica)
    }
    return await query(this.primaryClient)
  }

  /**
   * Execute write query (always uses primary)
   */
  async write<T = any>(
    query: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> {
    return await query(this.primaryClient)
  }
}

/**
 * Decorator to mark functions as read-only (for replica routing)
 */
export function ReadReplica(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
    // This is a marker for future automatic query routing
    // Can be extended to automatically use replica client
    return originalMethod.apply(this, args)
  }

  return descriptor
}

/**
 * Reporting query helper
 * Optimized for long-running analytical queries on replica
 */
export class ReportingQueries {
  /**
   * Execute reporting query with retry logic
   */
  static async execute<T = any>(
    queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
    options?: {
      maxRetries?: number
      retryDelay?: number
      timeout?: number
    }
  ): Promise<{ data: T | null; error: any }> {
    const { maxRetries = 3, retryDelay = 1000, timeout = 30000 } = options || {}

    let lastError: any
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get replica client with health check
        const client = await getReplicaClient({ skipHealthCheck: attempt > 0 })

        // Execute query with timeout
        const result = await Promise.race([
          queryFn(client),
          new Promise<{ data: null; error: any }>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          ),
        ])

        // Return if successful
        if (!result.error) {
          return result
        }

        lastError = result.error

        // Don't retry on certain errors
        if (result.error.code === 'PGRST116' || // No rows
            result.error.code === '42P01') {     // Table doesn't exist
          return result
        }

        // Wait before retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        }
      } catch (error) {
        lastError = error
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        }
      }
    }

    return { data: null, error: lastError }
  }
}

export default {
  getReplicaClient,
  isReplicaAvailable,
  getReplicaConfig,
  QueryRouter,
  ReportingQueries,
}
