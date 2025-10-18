import { useState, useCallback, useMemo } from 'react';
import { CONNECTION_DEFAULTS } from '@core/shared/ClientConstants.js';

// Optimized command history hook with better performance
export const useCommandHistory = (maxSize = CONNECTION_DEFAULTS.maxHistorySize) => {
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addToHistory = useCallback((command) => {
    if (!command || command === history[0]) return;

    setHistory(prev => {
      const newHistory = [command, ...prev];
      return newHistory.slice(0, maxSize);
    });
    setHistoryIndex(-1);
  }, [history, maxSize]);

  const navigateHistory = useCallback((direction) => {
    if (history.length === 0) return null;

    setHistoryIndex(prevIndex => {
      let newIndex;
      if (direction === 'up') {
        newIndex = Math.min(prevIndex + 1, history.length - 1);
      } else if (direction === 'down') {
        newIndex = prevIndex <= 0 ? -1 : prevIndex - 1;
        if (newIndex === -1) return -1;
      } else {
        return prevIndex;
      }

      return newIndex;
    });

    // Return current history value based on new index
    return history[historyIndex === -1 ? 0 : historyIndex] || null;
  }, [history, historyIndex]);

  const resetHistoryNavigation = useCallback(() => {
    setHistoryIndex(-1);
  }, []);

  return useMemo(() => ({
    history,
    historyIndex,
    addToHistory,
    navigateHistory,
    resetHistoryNavigation
  }), [history, historyIndex, addToHistory, navigateHistory, resetHistoryNavigation]);
};

export const useInputWithHistory = (maxSize = CONNECTION_DEFAULTS.maxHistorySize) => {
  const [inputValue, setInputValue] = useState('');
  const {
    history,
    addToHistory,
    navigateHistory,
    resetHistoryNavigation
  } = useCommandHistory(maxSize);

  const handleSubmit = useCallback((onSubmit) => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      onSubmit(trimmedValue);
      addToHistory(trimmedValue);
      setInputValue('');
      resetHistoryNavigation();
    }
  }, [inputValue, addToHistory, resetHistoryNavigation]);

  const handleArrowNavigation = useCallback((e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const historyValue = navigateHistory('up');
      if (historyValue) setInputValue(historyValue);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const historyValue = navigateHistory('down');
      setInputValue(historyValue || '');
    }
  }, [navigateHistory]);

  return useMemo(() => ({
    inputValue,
    setInputValue,
    history,
    handleSubmit,
    handleArrowNavigation,
    addToHistory
  }), [inputValue, history, handleSubmit, handleArrowNavigation, addToHistory]);
};