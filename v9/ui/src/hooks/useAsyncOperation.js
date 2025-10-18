import { useState, useCallback, useRef } from 'react';

/**
 * Generic async operation hook
 * Eliminates duplication in async operations like API calls and WebSocket requests
 */

const useAsyncOperation = (operation, dependencies = []) => {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null
  });

  const operationRef = useRef(operation);
  const abortControllerRef = useRef(null);

  // Keep operation ref updated
  operationRef.current = operation;

  const execute = useCallback(async (...args) => {
    // Cancel previous operation if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await operationRef.current(...args);

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }

      setState({
        data: result,
        loading: false,
        error: null
      });

      return result;
    } catch (error) {
      // Don't update state if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Operation failed'
      }));

      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      data: null,
      loading: false,
      error: null
    });
  }, []);

  const retry = useCallback(() => {
    return execute();
  }, [execute]);

  // Cleanup on unmount
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    ...state,
    execute,
    reset,
    retry,
    cancel
  };
};

export default useAsyncOperation;