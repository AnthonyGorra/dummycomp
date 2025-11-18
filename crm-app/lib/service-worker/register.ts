// Service Worker Registration Utility
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('Service Worker update found');

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New Service Worker available');

            // Optionally notify user about update
            if (confirm('New version available! Reload to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controller changed');
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    console.log('Service Worker unregistered:', success);
    return success;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
};

// Send message to service worker
export const sendMessageToSW = (message: any): void => {
  if (typeof window === 'undefined' || !navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage(message);
};

// Pre-cache specific URLs
export const preCacheUrls = (urls: string[]): void => {
  sendMessageToSW({
    type: 'CACHE_URLS',
    urls,
  });
};

// Clear all caches
export const clearAllCaches = (): void => {
  sendMessageToSW({
    type: 'CLEAR_CACHE',
  });
};

// Check if user is online
export const isOnline = (): boolean => {
  return typeof window !== 'undefined' ? navigator.onLine : true;
};

// Listen for online/offline events
export const onConnectionChange = (
  callback: (online: boolean) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
