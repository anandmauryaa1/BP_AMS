'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { soundService } from '@/lib/audioSound';

export type RealTimeEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'TASK_ASSIGNED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'DELIVERABLE_CREATED'
  | 'DELIVERABLE_UPDATED'
  | 'DELIVERABLE_DELETED'
  | 'ATTENDANCE_UPDATED'
  | 'LEAVE_UPDATED'
  | 'NOTIFICATION_RECEIVED'
  | 'NOTIFICATION_NEW'
  | 'CONNECTED'
  | 'ping'
  | string;

export interface RealTimePayload {
  event: RealTimeEventType;
  data: any;
  timestamp: number;
}

interface RealTimeContextType {
  isConnected: boolean;
  lastEvent: RealTimePayload | null;
  subscribe: (event: RealTimeEventType, callback: (data: any) => void) => () => void;
}

const RealTimeContext = createContext<RealTimeContextType>({
  isConnected: false,
  lastEvent: null,
  subscribe: () => () => {},
});

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealTimePayload | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const subscribe = useCallback((event: RealTimeEventType, callback: (data: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // Return cleanup function to unsubscribe
    return () => {
      const set = listenersRef.current.get(event);
      if (set) {
        set.delete(callback);
      }
    };
  }, []);

  const dispatchToListeners = (eventName: string, data: any) => {
    // 1. Direct listeners in listenersRef
    const listeners = listenersRef.current.get(eventName);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[RealTime] Error in listener for ${eventName}:`, err);
        }
      });
    }

    // 2. Global wildcard listeners
    const allListeners = listenersRef.current.get('*');
    if (allListeners) {
      allListeners.forEach((cb) => {
        try {
          cb({ event: eventName, data });
        } catch (err) {
          console.error(`[RealTime] Error in wildcard listener:`, err);
        }
      });
    }

    // 3. Dispatch standard DOM CustomEvent on window for universal access
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('bp:realtime', {
          detail: { event: eventName, data, timestamp: Date.now() },
        })
      );
    }
  };

  useEffect(() => {
    let isUnmounted = false;

    const connectSSE = () => {
      if (typeof window === 'undefined') return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const url = token ? `/api/realtime/stream?token=${encodeURIComponent(token)}` : '/api/realtime/stream';

      try {
        const es = new EventSource(url, { withCredentials: true });
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!isUnmounted) {
            setIsConnected(true);
            console.log('[RealTime] SSE stream connected successfully.');
          }
        };

        es.onerror = () => {
          if (!isUnmounted) {
            setIsConnected(false);
            es.close();
            // Schedule reconnect after 3 seconds
            if (!reconnectTimeoutRef.current) {
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                connectSSE();
              }, 3000);
            }
          }
        };

        // Attach listeners for all standard system events
        const eventNames: RealTimeEventType[] = [
          'TASK_CREATED',
          'TASK_UPDATED',
          'TASK_DELETED',
          'TASK_ASSIGNED',
          'PROJECT_CREATED',
          'PROJECT_UPDATED',
          'PROJECT_DELETED',
          'DELIVERABLE_CREATED',
          'DELIVERABLE_UPDATED',
          'DELIVERABLE_DELETED',
          'ATTENDANCE_UPDATED',
          'LEAVE_UPDATED',
          'NOTIFICATION_RECEIVED',
          'CONNECTED',
        ];

        eventNames.forEach((evName) => {
          es.addEventListener(evName, (event: MessageEvent) => {
            try {
              const parsed = JSON.parse(event.data);
              const eventPayload: RealTimePayload = {
                event: evName,
                data: parsed.data || parsed,
                timestamp: parsed.timestamp || Date.now(),
              };

              if (!isUnmounted) {
                setLastEvent(eventPayload);
                dispatchToListeners(evName, parsed.data || parsed);
              }
            } catch (err) {
              console.warn(`[RealTime] Error parsing ${evName} event:`, err);
            }
          });
        });
      } catch (err) {
        console.warn('[RealTime] Could not establish EventSource:', err);
      }
    };

    connectSSE();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <RealTimeContext.Provider value={{ isConnected, lastEvent, subscribe }}>
      {children}
    </RealTimeContext.Provider>
  );
};

export function useRealTime() {
  return useContext(RealTimeContext);
}

/**
 * Custom hook to subscribe to specific real-time events in React components
 */
export function useRealTimeEvent(event: RealTimeEventType, callback: (data: any) => void) {
  const { subscribe } = useRealTime();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribe = subscribe(event, (data) => {
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    });
    return unsubscribe;
  }, [event, subscribe]);
}
