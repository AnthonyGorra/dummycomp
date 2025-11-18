import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from './redis';
import { SupabaseClient } from '@supabase/supabase-js';

export interface QueryCacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  key?: string; // Custom cache key
  enabled?: boolean; // Enable/disable caching
}

export class DatabaseQueryCache {
  private prefix = 'db:';

  // Generate cache key from query
  private generateKey(table: string, params: any, customKey?: string): string {
    if (customKey) {
      return `${this.prefix}${customKey}`;
    }

    const paramsHash = JSON.stringify(params);
    return `${this.prefix}${table}:${Buffer.from(paramsHash).toString('base64').slice(0, 50)}`;
  }

  // Cache a query result
  async cacheQuery<T = any>(
    key: string,
    data: T,
    options: QueryCacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl || 300; // Default 5 minutes

    const cachedData = {
      data,
      tags: options.tags || [],
      cachedAt: Date.now(),
    };

    await cacheSet(key, cachedData, ttl);
  }

  // Get cached query result
  async getCachedQuery<T = any>(key: string): Promise<T | null> {
    const cached = await cacheGet<{ data: T; tags: string[]; cachedAt: number }>(key);
    return cached ? cached.data : null;
  }

  // Invalidate cache by table name
  async invalidateTable(tableName: string): Promise<void> {
    await cacheDeletePattern(`${this.prefix}${tableName}:*`);
  }

  // Invalidate cache by tags
  async invalidateByTags(tags: string[]): Promise<void> {
    // This would require more sophisticated tag tracking
    // For now, we'll implement basic pattern matching
    for (const tag of tags) {
      await cacheDeletePattern(`${this.prefix}*${tag}*`);
    }
  }

  // Invalidate specific cache entry
  async invalidateQuery(key: string): Promise<void> {
    await cacheDelete(key);
  }

  // Wrapper for Supabase queries with caching
  async cachedQuery<T = any>(
    supabase: SupabaseClient,
    tableName: string,
    queryFn: (client: SupabaseClient) => any,
    options: QueryCacheOptions = {}
  ): Promise<{ data: T | null; error: any; fromCache: boolean }> {
    if (options.enabled === false) {
      const result = await queryFn(supabase);
      return { ...result, fromCache: false };
    }

    const cacheKey = this.generateKey(tableName, queryFn.toString(), options.key);

    // Try to get from cache
    const cached = await this.getCachedQuery<T>(cacheKey);

    if (cached) {
      return {
        data: cached,
        error: null,
        fromCache: true,
      };
    }

    // Execute query
    const result = await queryFn(supabase);

    // Cache successful results
    if (!result.error && result.data) {
      await this.cacheQuery(cacheKey, result.data, options);
    }

    return { ...result, fromCache: false };
  }
}

export const dbCache = new DatabaseQueryCache();

// Helper hooks for common Supabase operations
export const createCachedSupabaseQuery = <T = any>(
  supabase: SupabaseClient,
  options: QueryCacheOptions = {}
) => {
  return {
    // Select query with cache
    select: async (
      tableName: string,
      queryBuilder: (client: any) => any
    ): Promise<{ data: T | null; error: any; fromCache: boolean }> => {
      return dbCache.cachedQuery<T>(
        supabase,
        tableName,
        (client) => queryBuilder(client.from(tableName)),
        options
      );
    },

    // Invalidate table cache
    invalidate: async (tableName: string) => {
      await dbCache.invalidateTable(tableName);
    },

    // Invalidate by tags
    invalidateByTags: async (tags: string[]) => {
      await dbCache.invalidateByTags(tags);
    },
  };
};

// Middleware to auto-invalidate cache on mutations
export const withCacheInvalidation = (
  tableName: string,
  tags: string[] = []
) => {
  return async <T = any>(
    mutationFn: () => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> => {
    const result = await mutationFn();

    // Invalidate cache on successful mutation
    if (!result.error) {
      await dbCache.invalidateTable(tableName);
      if (tags.length > 0) {
        await dbCache.invalidateByTags(tags);
      }
    }

    return result;
  };
};
