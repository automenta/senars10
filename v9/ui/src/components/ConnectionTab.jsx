import React, { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ReasonerControlPanel from './ReasonerControlPanel';
import LogList from './LogList';
import TasksPanel from './TasksPanel';
import ConceptMap from './ConceptMap';
import DraggablePanel from './DraggablePanel';
import SystemStatusPanel from './SystemStatusPanel';
import useCrdtWebSocket from '../core/crdtWebSocket';
import CommandService from '../services/CommandService';
import { PANEL_CONFIG, THEME } from '../constants';
import Panel from './Panel';
import { getStatusColor as getConnectionStatusStyle, getConnectionStatusText } from '../utils/uiHelpers';

const ConnectionTab = ({ name, url }) => {
  const {
    connectionStatus,
    error,
    tasks,
    logs,
    concepts,
    reasonerStats,
    sendRawMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
  } = useCrdtWebSocket(url);
  const [activeId, setActiveId] = useState(null);

  const [panels, setPanels] = useState([
    PANEL_CONFIG.topPanel,
    PANEL_CONFIG.conceptMapPanel,
    PANEL_CONFIG.bottomPanel,
  ]);

  // Create command service instance
  const commandService = new CommandService(sendRawMessage);

  const handleCommand = (command, payload = {}) => {
    commandService.execute(command, payload);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (active.id !== over.id) {
      setPanels(prev => {
        const oldIndex = prev.findIndex(item => item.id === active.id);
        const newIndex = prev.findIndex(item => item.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const renderPanel = (panel) => {
    switch (panel.id) {
      case 'topPanel':
        return (
          <Panel title={panel.name}>
            <ReasonerControlPanel 
              stats={reasonerStats} 
              onCommand={handleCommand} 
              onAddTask={handleAddTask} 
            />
          </Panel>
        );
      case 'conceptMapPanel':
        return (
          <Panel title={panel.name}>
            <ConceptMap concepts={concepts} tasks={tasks} />
          </Panel>
        );
      case 'bottomPanel':
        return (
          <div style={{ display: 'flex', gap: THEME.spacing.md, height: '100%' }}>
            <div style={{ flex: 1 }}>
              <Panel title="Log">
                <LogList logs={logs} />
              </Panel>
            </div>
            <div style={{ flex: 1 }}>
              <Panel title="Tasks">
                <TasksPanel
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                />
              </Panel>
            </div>
            <div style={{ flex: 0.8 }}>
              <Panel title="System">
                <SystemStatusPanel
                  stats={reasonerStats}
                  connectionStatus={connectionStatus}
                  tasks={tasks}
                  concepts={concepts}
                />
              </Panel>
            </div>
          </div>
        );
      default:
        return null;
    }
  };



  const errorStyles = {
    padding: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
    borderRadius: THEME.borderRadius,
    color: THEME.colors.white,
    backgroundColor: THEME.colors.danger,
  };

  return (
    <div className="connection-tab">
      <div style={getConnectionStatusStyle(connectionStatus, THEME)}>
        <strong>Connection:</strong> {name} ({url}) - Status: {getConnectionStatusText(connectionStatus)}
      </div>

      {error && (
        <div style={errorStyles}>
          <strong>Error:</strong> {error.message}
        </div>
      )}

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={panels}
          strategy={verticalListSortingStrategy}
        >
          <div className="main-layout">
            {panels.map(panel => (
              <DraggablePanel key={panel.id} id={panel.id} activeId={activeId}>
                {renderPanel(panel)}
              </DraggablePanel>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default ConnectionTab;
