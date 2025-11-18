'use client';

import { useEffect, useState } from 'react';
import { registerServiceWorker, onConnectionChange } from '@/lib/service-worker/register';

export function ServiceWorkerProvider() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Listen for online/offline events
    const cleanup = onConnectionChange((online) => {
      setIsOnline(online);

      // Optionally show a toast notification
      if (!online) {
        console.log('You are offline. Some features may be limited.');
      } else {
        console.log('You are back online!');
      }
    });

    return cleanup;
  }, []);

  // Optionally render an offline indicator
  return null;
}
