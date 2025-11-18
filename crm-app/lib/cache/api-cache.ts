import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet } from './redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  tags?: string[]; // Cache tags for invalidation
  revalidate?: number; // Revalidate after n seconds
  bypassCache?: boolean; // Skip cache for this request
}

export interface CacheableResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

// Generate cache key from request
export const generateCacheKey = (req: NextRequest, customKey?: string): string => {
  if (customKey) {
    return `api:${customKey}`;
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams.toString();
  const path = url.pathname;

  return `api:${path}${searchParams ? `:${searchParams}` : ''}`;
};

// Cache API response
export const cacheApiResponse = async (
  key: string,
  response: CacheableResponse,
  options: CacheOptions = {}
): Promise<void> => {
  const ttl = options.ttl || 300; // Default 5 minutes

  const cachedData = {
    ...response,
    cachedAt: Date.now(),
    tags: options.tags || [],
  };

  await cacheSet(key, cachedData, ttl);
};

// Get cached API response
export const getCachedApiResponse = async (
  key: string
): Promise<CacheableResponse | null> => {
  const cached = await cacheGet<CacheableResponse & { cachedAt: number }>(key);

  if (!cached) {
    return null;
  }

  return {
    status: cached.status,
    headers: cached.headers,
    body: cached.body,
  };
};

// Middleware helper to cache API routes
export const withApiCache = (
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheOptions = {}
) => {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Only cache GET requests by default
    if (req.method !== 'GET' || options.bypassCache) {
      return handler(req);
    }

    const cacheKey = generateCacheKey(req, options.key);

    // Try to get from cache
    const cached = await getCachedApiResponse(cacheKey);

    if (cached) {
      return new NextResponse(JSON.stringify(cached.body), {
        status: cached.status,
        headers: {
          ...cached.headers,
          'X-Cache': 'HIT',
          'Content-Type': 'application/json',
        },
      });
    }

    // Execute handler
    const response = await handler(req);

    // Cache successful responses
    if (response.status >= 200 && response.status < 300) {
      try {
        const body = await response.clone().json();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        await cacheApiResponse(
          cacheKey,
          {
            status: response.status,
            headers,
            body,
          },
          options
        );

        // Return response with cache miss header
        return new NextResponse(JSON.stringify(body), {
          status: response.status,
          headers: {
            ...headers,
            'X-Cache': 'MISS',
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error caching response:', error);
      }
    }

    return response;
  };
};

// Invalidate cache by pattern
export const invalidateCacheByPattern = async (pattern: string): Promise<void> => {
  const { cacheDeletePattern } = await import('./redis');
  await cacheDeletePattern(`api:${pattern}*`);
};

// Invalidate cache by tags
export const invalidateCacheByTags = async (tags: string[]): Promise<void> => {
  // This would require a more sophisticated implementation with tag tracking
  // For now, we'll use pattern matching
  for (const tag of tags) {
    await invalidateCacheByPattern(tag);
  }
};
