import React from 'react';
import { Model, Layout } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import { layoutConfig } from '../config/layout-config.js';
import ConceptMap from './ConceptMap';
import TasksPanel from './TasksPanel';
import LogList from './LogList';
import SystemStatusPanel from './SystemStatusPanel';

const model = Model.fromJson(layoutConfig);

const DockingLayout = ({
  logs,
  tasks,
  concepts,
  memoryTasks,
  reasonerStats,
  connectionStatus,
  onUpdateTask,
  onDeleteTask,
}) => {
  const factory = (node) => {
    const component = node.getComponent();
    if (component === 'concept-map') {
      return <ConceptMap concepts={concepts} tasks={tasks} />;
    }
    if (component === 'tasks-panel') {
      return (
        <TasksPanel
          tasks={tasks}
          memoryTasks={memoryTasks}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      );
    }
    if (component === 'concepts-panel') {
      const ConceptsPanel = React.lazy(() => import('./ConceptsPanel'));
      return (
        <React.Suspense fallback={<div>Loading concepts...</div>}>
          <ConceptsPanel
            concepts={concepts}
            onUpdateConcept={onUpdateTask}
            onDeleteConcept={onDeleteTask}
          />
        </React.Suspense>
      );
    }
    if (component === 'log-list') {
        return <LogList logs={logs} />;
    }
    if (component === 'system-status') {
      return <SystemStatusPanel 
        stats={reasonerStats} 
        connectionStatus={connectionStatus}
        tasks={tasks}
        concepts={concepts}
      />;
    }
  };

  return <Layout model={model} factory={factory} />;
};

export default DockingLayout;
