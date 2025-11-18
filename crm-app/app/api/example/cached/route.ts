import { NextRequest, NextResponse } from 'next/server';
import { withApiCache } from '@/lib/cache/api-cache';

// Example API route with caching enabled
async function handler(req: NextRequest) {
  // Simulate expensive operation
  const data = {
    timestamp: new Date().toISOString(),
    message: 'This response is cached',
    random: Math.random(),
  };

  return NextResponse.json(data);
}

// Export with cache wrapper
// Cache for 5 minutes (300 seconds)
export const GET = withApiCache(handler, {
  ttl: 300,
  tags: ['example'],
});
