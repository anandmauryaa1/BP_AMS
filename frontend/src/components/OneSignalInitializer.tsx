'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { initOneSignal, loginToOneSignal, ONESIGNAL_APP_ID } from '@/lib/onesignal';

export function OneSignalInitializer() {
  useEffect(() => {
    if (!ONESIGNAL_APP_ID) return;

    initOneSignal();

    // Auto-sync employee external ID with OneSignal if logged in
    async function syncAuthUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            const externalId = data.user.employeeId || data.user.id || data.user._id;
            if (externalId) {
              loginToOneSignal(String(externalId));
            }
          }
        }
      } catch {
        // Non-fatal if session check fails
      }
    }

    syncAuthUser();
  }, []);

  if (!ONESIGNAL_APP_ID) return null;

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  );
}
