# Performance Infrastructure Setup Guide

## Overview

This project includes comprehensive performance infrastructure with:
- Redis caching for sessions and API responses
- Database query result caching
- CDN integration for static assets
- Browser caching optimization
- Service worker for offline capabilities
- Image optimization and lazy loading

## Quick Start

### 1. Install Dependencies

```bash
cd crm-app
npm install
```

### 2. Start Redis Server

#### Option A: Using Docker Compose (Recommended)

```bash
cd crm-app
docker-compose -f docker-compose.performance.yml up -d
```

This starts:
- Redis server on port 6379
- Redis Commander (GUI) on port 8081

#### Option B: Using Docker

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

#### Option C: Local Installation

```bash
# macOS
brew install redis
redis-server

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Windows (WSL recommended)
# Follow WSL installation, then use Ubuntu instructions
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# CDN Configuration (optional)
NEXT_PUBLIC_CDN_URL=https://your-cdn-url.com
```

### 4. Run the Application

```bash
npm run dev
```

## Features Implemented

### ✅ Redis Caching
- **Location**: `crm-app/lib/cache/`
- **Files**: `redis.ts`, `session-store.ts`, `api-cache.ts`
- **Features**:
  - Session management with automatic TTL
  - API response caching
  - Cache invalidation patterns
  - Reconnection handling

### ✅ Database Query Caching
- **Location**: `crm-app/lib/cache/db-cache.ts`
- **Features**:
  - Supabase query result caching
  - Automatic cache invalidation on mutations
  - Tag-based cache invalidation
  - Configurable TTL per query

### ✅ CDN Integration
- **Location**: `crm-app/next.config.mjs`, `website/next.config.js`
- **Features**:
  - Static asset CDN prefix
  - Optimized cache headers
  - Image optimization settings

### ✅ Browser Caching
- **Location**: Next.js config headers
- **Features**:
  - Long-term caching for static assets (1 year)
  - Image caching with stale-while-revalidate
  - Security headers (X-Frame-Options, CSP, etc.)

### ✅ Service Worker
- **Location**: `crm-app/public/sw.js`, `website/public/sw.js`
- **Features**:
  - Offline support with custom offline page
  - Cache-first strategy for images
  - Network-first strategy for pages
  - Automatic cache size limits
  - Service worker registration utility

### ✅ Image Optimization
- **Location**: `crm-app/components/ui/optimized-image.tsx`
- **Features**:
  - Lazy loading with Intersection Observer
  - Progressive image loading (blur-up effect)
  - Multiple image format support (WebP, AVIF)
  - Responsive images with srcSet
  - Client-side image compression
  - Custom lazy load hooks

## Usage Examples

### Cached API Route

```typescript
// app/api/example/route.ts
import { withApiCache } from '@/lib/cache/api-cache';

export const GET = withApiCache(async (req) => {
  const data = await fetchData();
  return NextResponse.json(data);
}, { ttl: 300 });
```

### Cached Database Query

```typescript
import { dbCache } from '@/lib/cache/db-cache';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

const { data, fromCache } = await dbCache.cachedQuery(
  supabase,
  'clients',
  (client) => client.from('clients').select('*'),
  { ttl: 300, tags: ['clients'] }
);
```

### Optimized Image Component

```typescript
import { OptimizedImage } from '@/components/ui/optimized-image';

<OptimizedImage
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  lazy={true}
  showLoader={true}
/>
```

### Service Worker Registration

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

## Testing

### Test Redis Connection

```bash
# CLI
redis-cli ping
# Should return: PONG

# Or via Redis Commander
# Open http://localhost:8081
```

### Test Service Worker

1. Open DevTools (F12)
2. Go to Application → Service Workers
3. Verify service worker is registered
4. Test offline mode:
   - Network tab → Throttling → Offline
   - Refresh page
   - Should show offline.html

### Test Image Optimization

1. Open DevTools → Network
2. Load page with images
3. Check:
   - Images are WebP/AVIF format
   - Lazy loaded images load on scroll
   - Cache headers are set correctly

### Test API Caching

```bash
# First request (cache miss)
curl -i http://localhost:3000/api/example/cached
# Check header: X-Cache: MISS

# Second request (cache hit)
curl -i http://localhost:3000/api/example/cached
# Check header: X-Cache: HIT
```

## Monitoring

### Redis Stats

Access Redis Commander at http://localhost:8081 to view:
- Memory usage
- Cache hit/miss ratios
- Active keys
- Connected clients

### Performance Metrics

Use browser DevTools to monitor:
- **Lighthouse**: Performance score
- **Network tab**: Cache hits, response times
- **Application tab**: Service worker status, cache storage

## Troubleshooting

### Redis Connection Error

```
Error: ECONNREFUSED 127.0.0.1:6379
```

**Solution**:
- Ensure Redis is running: `docker ps` or `redis-cli ping`
- Check REDIS_URL in .env
- Restart Redis: `docker-compose -f docker-compose.performance.yml restart redis`

### Service Worker Not Updating

**Solution**:
- Unregister old service worker in DevTools
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Check for service worker errors in console

### Images Not Optimizing

**Solution**:
- Verify Next.js Image component is used correctly
- Check image paths are correct
- Ensure width/height are specified
- Check CDN_URL configuration

## Production Deployment

### Redis

For production, use a managed Redis service:
- **AWS**: Amazon ElastiCache
- **Google Cloud**: Cloud Memorystore
- **Azure**: Azure Cache for Redis
- **Vercel**: Upstash Redis
- **Self-hosted**: Redis Cluster for high availability

### CDN

Configure a CDN provider:
- **Cloudflare**: Full CDN + Image optimization
- **AWS CloudFront**: S3 + CloudFront
- **Vercel**: Built-in Edge Network
- **Cloudinary**: Image CDN with transformations

### Environment Variables

Update production environment:
```env
REDIS_URL=redis://production-redis:6379
REDIS_PASSWORD=strong_production_password
NEXT_PUBLIC_CDN_URL=https://cdn.yourdomain.com
```

## Performance Impact

Expected improvements:
- **API Response Time**: 50-90% reduction (cached responses)
- **Database Load**: 40-70% reduction (query caching)
- **Page Load Time**: 30-50% faster (CDN + caching)
- **Image Load Time**: 40-60% faster (optimization + lazy loading)
- **Offline Support**: Full offline browsing capability

## Documentation

For detailed documentation, see:
- [CRM App Performance Docs](./crm-app/PERFORMANCE.md)
- [Redis Documentation](https://redis.io/documentation)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the detailed documentation in `crm-app/PERFORMANCE.md`
3. Check browser console for errors
4. Verify Redis connection and configuration
