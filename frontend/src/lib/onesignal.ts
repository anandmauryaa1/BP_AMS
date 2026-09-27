'use client';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => Promise<void> | void>;
    OneSignal?: any;
  }
}

export const ONESIGNAL_APP_ID =
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'ba184f42-0674-498b-aa06-dd096ef5fcc3';

let isInitialized = false;

/**
 * Initialize OneSignal Web SDK v16
 */
export function initOneSignal(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    if (isInitialized && window.OneSignal) {
      return resolve(window.OneSignal);
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        if (!isInitialized) {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: {
              enable: false, // We use custom UI components
            },
          });
          isInitialized = true;
        }
        resolve(OneSignal);
      } catch (err) {
        console.warn('[OneSignal] Initialization notice:', err);
        resolve(null);
      }
    });
  });
}

/**
 * Associate the active browser session with an authenticated employee or user ID
 */
export async function loginToOneSignal(externalId: string): Promise<void> {
  if (typeof window === 'undefined' || !externalId) return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.login(String(externalId));
    } catch (err) {
      console.warn('[OneSignal] Login error:', err);
    }
  });
}

/**
 * Dissociate external ID on logout
 */
export async function logoutFromOneSignal(): Promise<void> {
  if (typeof window === 'undefined') return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.logout();
    } catch (err) {
      console.warn('[OneSignal] Logout error:', err);
    }
  });
}

/**
 * Prompt browser permission and opt-in user to OneSignal push
 */
export async function optInOneSignal(): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Window not defined' };

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.User.PushSubscription.optIn();
        const isOptedIn = OneSignal.User?.PushSubscription?.optedIn ?? true;
        resolve({ success: isOptedIn });
      } catch (err: any) {
        resolve({ success: false, error: err?.message || 'Failed to opt in to OneSignal' });
      }
    });
  });
}

/**
 * Opt-out user from OneSignal push
 */
export async function optOutOneSignal(): Promise<{ success: boolean }> {
  if (typeof window === 'undefined') return { success: false };

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.User.PushSubscription.optOut();
        resolve({ success: true });
      } catch {
        resolve({ success: false });
      }
    });
  });
}

/**
 * Check if the user is currently opted in to OneSignal push
 */
export async function checkOneSignalSubscription(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        const optedIn = OneSignal.User?.PushSubscription?.optedIn;
        resolve(Boolean(optedIn));
      } catch {
        resolve(false);
      }
    });
  });
}
