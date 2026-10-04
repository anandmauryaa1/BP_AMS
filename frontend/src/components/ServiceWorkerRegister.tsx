'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pushClient';

export function ServiceWorkerRegister() {
  useEffect(() => {
    const register = () => {
      registerServiceWorker().catch((err) => {
        console.warn('[ServiceWorker] Auto-registration notice:', err);
      });
    };

    if (typeof window === 'undefined') return;

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(register, { timeout: 3000 });
    } else {
      const timer = setTimeout(register, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
