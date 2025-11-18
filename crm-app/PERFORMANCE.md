# Performance Infrastructure Documentation

This document outlines the comprehensive performance infrastructure implemented in the CRM application.

## Table of Contents

1. [Redis Caching](#redis-caching)
2. [Database Query Caching](#database-query-caching)
3. [API Response Caching](#api-response-caching)
4. [CDN Integration](#cdn-integration)
5. [Browser Caching](#browser-caching)
6. [Service Worker & Offline Support](#service-worker--offline-support)
7. [Image Optimization](#image-optimization)
8. [Setup & Configuration](#setup--configuration)

## Redis Caching

### Overview

Redis is used for session management and caching throughout the application.

### Session Management

```typescript
import { sessionStore } from '@/lib/cache/session-store';

// Create session
await sessionStore.createSession('session-id', {
  userId: 'user-123',
  email: 'user@example.com',
  role: 'admin',
});

// Get session
const session = await sessionStore.getSession('session-id');

// Update session
await sessionStore.updateSession('session-id', {
  metadata: { lastPage: '/dashboard' },
});

// Delete session
await sessionStore.deleteSession('session-id');
```

### Basic Caching

```typescript
import { cacheGet, cacheSet, cacheDelete } from '@/lib/cache/redis';

// Set cache
await cacheSet('key', { data: 'value' }, 3600); // TTL: 1 hour

// Get cache
const data = await cacheGet('key');

// Delete cache
await cacheDelete('key');
```

## Database Query Caching

### Overview

Automatically cache Supabase query results to reduce database load.

### Usage

```typescript
import { createClient } from '@/lib/supabase';
import { dbCache } from '@/lib/cache/db-cache';

const supabase = createClient();

// Cached query
const result = await dbCache.cachedQuery(
  supabase,
  'clients',
  (client) => client.from('clients').select('*'),
  {
    ttl: 300, // Cache for 5 minutes
    tags: ['clients'],
    key: 'all-clients', // Optional custom key
  }
);

// Invalidate cache after mutation
await dbCache.invalidateTable('clients');
```

### Auto-invalidation on Mutations

```typescript
import { withCacheInvalidation } from '@/lib/cache/db-cache';

const updateClient = withCacheInvalidation('clients', ['client-list']);

const result = await updateClient(async () => {
  return supabase
    .from('clients')
    .update({ name: 'New Name' })
    .eq('id', 'client-id');
});
```

## API Response Caching

### Overview

Cache API route responses using Redis.

### Implementation

```typescript
// app/api/your-route/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withApiCache } from '@/lib/cache/api-cache';

async function handler(req: NextRequest) {
  const data = await fetchData();
  return NextResponse.json(data);
}

export const GET = withApiCache(handler, {
  ttl: 300, // Cache for 5 minutes
  tags: ['api-data'],
  key: 'custom-key', // Optional
});
```

### Cache Invalidation

```typescript
import { invalidateCacheByPattern, invalidateCacheByTags } from '@/lib/cache/api-cache';

// Invalidate by pattern
await invalidateCacheByPattern('clients');

// Invalidate by tags
await invalidateCacheByTags(['client-list', 'client-details']);
```

## CDN Integration

### Configuration

Set your CDN URL in `.env`:

```env
NEXT_PUBLIC_CDN_URL=https://your-cdn-url.com
```

### Static Asset Caching

Static assets are automatically served from the CDN with the following cache policies:

- Static files (`/static/*`): 1 year cache
- Next.js static files (`/_next/static/*`): 1 year cache
- Images (`/_next/image/*`): 1 day cache with stale-while-revalidate

## Browser Caching

### Cache Headers

The following cache headers are automatically set:

| Resource Type | Cache-Control | Duration |
|--------------|---------------|----------|
| Static Assets | `public, max-age=31536000, immutable` | 1 year |
| Images | `public, max-age=86400, stale-while-revalidate=604800` | 1 day + 7 day stale |
| API Routes | `public, max-age=0, must-revalidate` | No cache |

### Security Headers

Additional security headers are configured:
- `X-DNS-Prefetch-Control: on`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`

## Service Worker & Offline Support

### Registration

Register the service worker in your root layout or app component:

```typescript
'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker/register';

export function ServiceWorkerProvider() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
```

### Caching Strategies

- **Network-only**: API routes (no caching)
- **Cache-first**: Images and static assets
- **Network-first**: Pages and dynamic content

### Offline Fallback

When offline, users see a custom offline page at `/offline.html`.

### Service Worker Controls

```typescript
import {
  preCacheUrls,
  clearAllCaches,
  onConnectionChange,
} from '@/lib/service-worker/register';

// Pre-cache URLs
preCacheUrls(['/dashboard', '/clients']);

// Clear all caches
clearAllCaches();

// Listen for connection changes
const cleanup = onConnectionChange((online) => {
  console.log('Connection status:', online);
});
```

## Image Optimization

### Optimized Image Component

```typescript
import { OptimizedImage } from '@/components/ui/optimized-image';

<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  width={800}
  height={600}
  lazy={true}
  showLoader={true}
  fallback="/placeholder.png"
/>
```

### Lazy Loading Hook

```typescript
import { useLazyLoad } from '@/hooks/use-lazy-load';

function MyComponent() {
  const { ref, isVisible } = useLazyLoad({
    threshold: 0.1,
    rootMargin: '50px',
  });

  return (
    <div ref={ref}>
      {isVisible && <ExpensiveComponent />}
    </div>
  );
}
```

### Progressive Image Loading

```typescript
import { useProgressiveImage } from '@/hooks/use-lazy-load';

function MyComponent() {
  const { currentSrc, isLoading } = useProgressiveImage(
    '/low-quality.jpg',
    '/high-quality.jpg'
  );

  return (
    <img
      src={currentSrc}
      className={isLoading ? 'blur-sm' : ''}
      alt="Progressive"
    />
  );
}
```

### Image Optimization Utilities

```typescript
import {
  getOptimizedImageUrl,
  generateSrcSet,
  compressImage,
  preloadImage,
} from '@/lib/image/optimization';

// Get optimized URL
const url = getOptimizedImageUrl('/image.jpg', {
  width: 800,
  height: 600,
  quality: 75,
  format: 'webp',
});

// Generate srcSet
const srcSet = generateSrcSet('/image.jpg', [640, 1024, 1920]);

// Compress image (client-side)
const blob = await compressImage(file, 1920, 0.8);

// Preload critical images
preloadImage('/hero.jpg', { width: 1920 });
```

## Setup & Configuration

### 1. Install Dependencies

```bash
npm install redis
```

### 2. Configure Environment Variables

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# CDN Configuration
NEXT_PUBLIC_CDN_URL=https://your-cdn-url.com
```

### 3. Start Redis Server

#### Using Docker:

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

#### Using Docker Compose (included):

```yaml
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
volumes:
  redis-data:
```

```bash
docker-compose up -d
```

### 4. Register Service Worker

Add to your root layout:

```typescript
// app/layout.tsx
import { ServiceWorkerProvider } from '@/components/service-worker-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ServiceWorkerProvider />
        {children}
      </body>
    </html>
  );
}
```

### 5. Use Optimized Images

Replace standard `<img>` or Next.js `<Image>` with `<OptimizedImage>`:

```typescript
import { OptimizedImage } from '@/components/ui/optimized-image';

<OptimizedImage
  src="/image.jpg"
  alt="Optimized"
  width={800}
  height={600}
/>
```

## Performance Best Practices

### 1. Cache Invalidation

- Invalidate caches when data changes
- Use specific cache keys for fine-grained control
- Group related caches with tags

### 2. Cache TTL Guidelines

| Data Type | Recommended TTL |
|-----------|----------------|
| Static data | 1 hour - 1 day |
| User data | 5-15 minutes |
| Frequently changing | 1-5 minutes |
| Real-time data | No cache |

### 3. Image Optimization

- Use WebP/AVIF formats
- Implement lazy loading for below-fold images
- Provide width and height to prevent layout shift
- Use appropriate quality settings (75-85)

### 4. Service Worker

- Keep service worker logic simple
- Test offline functionality thoroughly
- Implement proper cache size limits
- Handle cache updates gracefully

## Monitoring & Debugging

### Redis Cache Stats

```typescript
import { getRedisClient } from '@/lib/cache/redis';

const client = await getRedisClient();
const info = await client.info();
console.log('Redis Stats:', info);
```

### Cache Hit/Miss Tracking

API responses include `X-Cache` header:
- `X-Cache: HIT` - Response from cache
- `X-Cache: MISS` - Fresh response, now cached

### Service Worker Status

Check service worker status in browser DevTools:
- Chrome: Application → Service Workers
- Firefox: about:debugging → This Firefox → Service Workers

## Troubleshooting

### Redis Connection Issues

- Verify Redis is running: `docker ps` or `redis-cli ping`
- Check environment variables
- Verify network connectivity

### Service Worker Not Registering

- Ensure app is served over HTTPS (or localhost)
- Check browser console for errors
- Verify `/sw.js` is accessible

### Images Not Optimizing

- Check `NEXT_PUBLIC_CDN_URL` configuration
- Verify image paths are correct
- Check browser network tab for optimization params

## Additional Resources

- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Redis Documentation](https://redis.io/documentation)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Performance Best Practices](https://web.dev/performance/)
