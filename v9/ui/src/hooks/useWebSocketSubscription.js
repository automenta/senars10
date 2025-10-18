import { useEffect, useCallback, useRef } from 'react';

/**
 * Generic WebSocket subscription hook
 * Eliminates duplication in subscription management across components
 */

const useWebSocketSubscription = (event, listener, dependencies = []) => {
  const listenerRef = useRef(listener);
  const cleanupRef = useRef(null);

  // Keep listener ref updated
  listenerRef.current = listener;

  // Memoize the subscription handler
  const subscribe = useCallback((on, off) => {
    if (!on || !off || !event) return;

    const wrappedListener = (...args) => {
      listenerRef.current?.(...args);
    };

    on(event, wrappedListener);

    // Return cleanup function
    return () => {
      off(event, wrappedListener);
    };
  }, [event]);

  // Auto-manage subscription lifecycle
  useEffect(() => {
    return () => {
      // Cleanup any existing subscription
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, dependencies);

  // Manual subscription management
  const manageSubscription = useCallback((on, off) => {
    // Clean up previous subscription
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    // Set up new subscription
    cleanupRef.current = subscribe(on, off);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [subscribe]);

  return {
    subscribe: manageSubscription,
    isSubscribed: !!cleanupRef.current
  };
};

export default useWebSocketSubscription;