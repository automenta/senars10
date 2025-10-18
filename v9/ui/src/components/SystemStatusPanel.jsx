import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { createPanelStyle, createHeaderStyle, createStatBoxStyle } from '../utils/uiHelpers';
import { THEME } from '../constants';
import { getStatusColor as getConnectionStatusColor } from '../utils/uiHelpers';

const SystemStatusPanel = ({ stats, connectionStatus, tasks = [], concepts = [] }) => {
  // Calculate system metrics
  const systemMetrics = {
    uptime: stats?.timestamp ? Math.floor((Date.now() - stats.timestamp) / 1000) : 0,
    activeTasks: tasks.length,
    concepts: concepts.length,
    cpuUsage: stats?.throttle || 100,
    memoryEstimate: (tasks.length * 0.1 + concepts.length * 0.05).toFixed(2) // rough estimate in MB
  };

  // Prepare data for charts
  const cyclesData = [
    { name: 'Now', cycles: stats?.cycles || 0 },
    { name: '-5s', cycles: (stats?.cycles || 0) - 5 },
    { name: '-10s', cycles: (stats?.cycles || 0) - 10 },
    { name: '-15s', cycles: (stats?.cycles || 0) - 15 },
    { name: '-20s', cycles: (stats?.cycles || 0) - 20 },
  ];

  const tasksData = [
    { name: 'Now', tasks: tasks.length },
    { name: '-5s', tasks: Math.max(0, tasks.length - 2) },
    { name: '-10s', tasks: Math.max(0, tasks.length - 1) },
    { name: '-15s', tasks: tasks.length },
    { name: '-20s', tasks: Math.max(0, tasks.length - 3) },
  ];



  const getSystemHealth = () => {
    if (!stats) return { level: 'unknown', message: 'Unknown' };
    
    const { cycles } = stats;
    const taskCount = tasks.length;
    const conceptCount = concepts.length;
    const cycleRate = cycles > 10 ? Math.round((cycles / systemMetrics.uptime) * 100) / 100 : 0;
    
    return taskCount > 100 || conceptCount > 50 ? { level: 'warning', message: 'High memory pressure' } :
           cycleRate > 10 ? { level: 'good', message: 'Active processing' } :
           cycles > 0 ? { level: 'good', message: 'Steady state' } :
           { level: 'info', message: 'Idle' };
  };

  const health = getSystemHealth();

  return (
    <div style={{...panelContainerStyle({ height: '100%', display: 'flex', flexDirection: 'column' }), border: '1px solid #ddd' }}>
      <h3 style={headerStyle({ margin: '0 0 12px 0', fontSize: '14px', color: '#333', paddingBottom: '6px' })}>
        System Status
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={statBoxStyle()}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Connection</div>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold',
            color: getConnectionStatusColor(connectionStatus)
          }}>
            {connectionStatus?.toUpperCase()}
          </div>
        </div>
        
        <div style={createStatBoxStyle()}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Health</div>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold',
            color: health.level === 'good' ? '#28a745' : 
                   health.level === 'warning' ? '#ffc107' : 
                   health.level === 'error' ? '#dc3545' : '#6c757d'
          }}>
            {health.message}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <div style={{...statBoxStyle({ textAlign: 'center' }), backgroundColor: '#f1f3f4' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#007bff' }}>
            {stats?.cycles || 0}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>Cycles</div>
        </div>
        <div style={{...statBoxStyle({ textAlign: 'center' }), backgroundColor: '#f1f3f4' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#28a745' }}>
            {tasks.length}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>Tasks</div>
        </div>
        <div style={{...statBoxStyle({ textAlign: 'center' }), backgroundColor: '#f1f3f4' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fd7e14' }}>
            {concepts.length}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>Concepts</div>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Cycles Trend</div>
        <div style={{ height: '60px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cyclesData}>
              <Area type="monotone" dataKey="cycles" stroke="#007bff" fill="#007bff30" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Tasks Trend</div>
        <div style={{ height: '60px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tasksData}>
              <Area type="monotone" dataKey="tasks" stroke="#28a745" fill="#28a74530" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#666', marginTop: 'auto' }}>
        <div>Uptime: {systemMetrics.uptime}s</div>
        <div>Est. Memory: {systemMetrics.memoryEstimate}MB</div>
      </div>
    </div>
  );
};

export default SystemStatusPanel;