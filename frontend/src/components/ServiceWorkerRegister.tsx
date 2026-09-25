'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pushClient';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Register service worker on initial browser render
    registerServiceWorker().catch((err) => {
      console.warn('[ServiceWorker] Auto-registration notice:', err);
    });
  }, []);

  return null;
}
