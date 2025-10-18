import React, { useEffect, useCallback, useMemo } from 'react';
import DockingLayout from '@/components/DockingLayout';
import ReasonerControlPanel from '@/components/ReasonerControlPanel';
import { UIProvider } from '@/core/UIContext';
import { NotificationProvider } from '@/core/NotificationSystem';
import { useAppWebSocket } from '@/hooks/useAppWebSocket';
import useCommandHandler from '@/hooks/useCommandHandler';
import './App.css';

// Main App component - optimized for performance and maintainability
const App = () => {
  const {
    tasks,
    logs,
    concepts,
    memoryTasks,
    reasonerStats,
    connectionStatus,
    sendRawMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    requestConcepts,
    requestTopTasks,
    requestState,
    on,
    off,
  } = useAppWebSocket();

  const { handleCommand } = useCommandHandler(
    sendRawMessage,
    requestState,
    requestConcepts,
    requestTopTasks,
    on,
    off
  );

  // Memoize task handlers for performance
  const handleTaskWithConcepts = useCallback((handler, task) => {
    const result = handler?.(task);
    if (result !== false) {
      setTimeout(requestConcepts, 300);
    }
    return result;
  }, [requestConcepts]);

  const handleAddTaskWithConcepts = useCallback((task) =>
    handleTaskWithConcepts(handleAddTask, task), [handleTaskWithConcepts, handleAddTask]);

  const handleUpdateTaskWithConcepts = useCallback((task) =>
    handleTaskWithConcepts(handleUpdateTask, task), [handleTaskWithConcepts, handleUpdateTask]);

  // Initialize data on connection
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const timer = setTimeout(() => {
        requestConcepts();
        requestTopTasks();
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [connectionStatus, requestConcepts, requestTopTasks]);

  // Memoize layout props for performance
  const layoutProps = useMemo(() => ({
    logs,
    tasks,
    concepts,
    memoryTasks,
    reasonerStats,
    connectionStatus,
    onUpdateTask: handleUpdateTaskWithConcepts,
    onDeleteTask: handleDeleteTask
  }), [
    logs,
    tasks,
    concepts,
    memoryTasks,
    reasonerStats,
    connectionStatus,
    handleUpdateTaskWithConcepts,
    handleDeleteTask
  ]);

  return (
    <UIProvider>
      <NotificationProvider>
        <div className="main-container" data-testid="app-container">
          <div className="docking-layout-container">
            <DockingLayout {...layoutProps} />
          </div>
          <ReasonerControlPanel
            stats={reasonerStats}
            onCommand={handleCommand}
            onAddTask={handleAddTaskWithConcepts}
          />
        </div>
      </NotificationProvider>
    </UIProvider>
  );
};

export default App;
