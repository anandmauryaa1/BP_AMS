import { apiFetch } from './api';
import {
  ONESIGNAL_APP_ID,
  optInOneSignal,
  optOutOneSignal,
  checkOneSignalSubscription,
} from './onesignal';

export const FALLBACK_VAPID_PUBLIC_KEY =
  'BK7Xg38hJND12d_9QDFs6aX-LZlftJ1a7wwog2f88LxtyUcii0oNPUTchgRTMbTDl73Q5ptrQB2cOobIifNRgUw';

/**
 * Utility to convert base64 URL safe VAPID key to Uint8Array for PushManager
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if current browser and platform support Service Worker Push Notifications
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current browser notification permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Register the Service Worker located in /sw.js
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    return registration;
  } catch (err) {
    console.error('[WebPush:Client] Failed registering Service Worker /sw.js:', err);
    return null;
  }
}

/**
 * Retrieve the active PushSubscription if already registered on this browser
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null | boolean> {
  if (ONESIGNAL_APP_ID) {
    const isSubscribed = await checkOneSignalSubscription();
    if (isSubscribed) return true as any;
  }

  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (err) {
    console.warn('[WebPush:Client] Error checking existing subscription:', err);
    return null;
  }
}

/**
 * Prompt user permission, subscribe device, and sync endpoint with backend API
 */
export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  subscription?: PushSubscription;
}> {
  if (ONESIGNAL_APP_ID) {
    const osResult = await optInOneSignal();
    if (osResult.success) {
      return {
        success: true,
        message: 'OneSignal Push notifications activated successfully.',
      };
    }
  }

  if (!isPushNotificationSupported()) {
    return {
      success: false,
      error: 'Web Push notifications are not supported on this browser or platform.',
    };
  }

  try {
    // 1. Ensure Service Worker is registered
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, error: 'Could not register service worker.' };
    }

    // 2. Request browser permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error:
          permission === 'denied'
            ? 'Push notifications are blocked in your browser settings. Please enable them to receive task & shift updates.'
            : 'Notification permission was dismissed.',
      };
    }

    // 3. Fetch server public VAPID key
    let publicKey = FALLBACK_VAPID_PUBLIC_KEY;
    try {
      const vapidRes = await apiFetch<{ publicKey: string }>('/api/notifications/vapid-public-key');
      if (vapidRes?.data?.publicKey) {
        publicKey = vapidRes.data.publicKey;
      }
    } catch {
      // Fallback key will be used
    }

    // 4. Register PushManager subscription
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }

    // 5. Send subscription endpoint & keys to backend API
    const subJSON = subscription.toJSON();
    const saveRes = await apiFetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: subJSON.endpoint,
          keys: subJSON.keys,
        },
      }),
    });

    if (!saveRes.success) {
      return {
        success: false,
        error: saveRes.error || 'Failed to sync push subscription with server.',
      };
    }

    return {
      success: true,
      message: 'Push notifications activated. You will receive live task schedules and operational alerts.',
      subscription,
    };
  } catch (err: any) {
    console.error('[WebPush:Client] Subscription error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to activate web push notifications.',
    };
  }
}

/**
 * Unsubscribe current browser session from Web Push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  if (ONESIGNAL_APP_ID) {
    await optOutOneSignal();
  }

  if (!isPushNotificationSupported()) {
    return { success: true, message: 'Unsubscribed from OneSignal.' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await apiFetch('/api/notifications/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint }),
      });
    }

    return {
      success: true,
      message: 'You have unsubscribed from browser push notifications.',
    };
  } catch (err: any) {
    console.error('[WebPush:Client] Unsubscribe error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to unsubscribe.',
    };
  }
}

/**
 * Dispatch an immediate test push notification through the server
 */
export async function sendTestPushNotification(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  return apiFetch('/api/notifications/test', {
    method: 'POST',
  });
}
