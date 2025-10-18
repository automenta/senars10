import React, { createContext, useContext, useState, useMemo } from 'react';
import UI_CONFIG from '../config/uiConfig';

const UIContext = createContext(null);

export const UIProvider = ({ config = UI_CONFIG, children, plugins = [] }) => {
  const [uiConfig, setUiConfig] = useState(config);
  const [activePlugins, setActivePlugins] = useState([]);

  // Plugin management
  const registerPlugin = (plugin) => {
    if (!activePlugins.some(p => p.id === plugin.id)) {
      setActivePlugins(prev => [...prev, plugin]);
      // Optionally merge plugin configuration
      if (plugin.config) {
        setUiConfig(prev => ({ ...prev, ...plugin.config }));
      }
    }
  };

  const unregisterPlugin = (pluginId) => {
    setActivePlugins(prev => prev.filter(p => p.id !== pluginId));
  };

  const updateConfig = (newConfig) => {
    setUiConfig(prev => ({ ...prev, ...newConfig }));
  };

  const updateComponentConfig = (componentName, newSettings) => {
    setUiConfig(prev => ({
      ...prev,
      [componentName]: { ...prev[componentName], ...newSettings }
    }));
  };

  // Expose plugin system and methods
  const contextValue = useMemo(() => ({
    config: uiConfig,
    updateConfig,
    updateComponentConfig,
    activePlugins,
    registerPlugin,
    unregisterPlugin,
    // Common utilities for plugins
    utils: {
      addComponent: (name, component) => {
        // Add component to UI configuration
        updateComponentConfig(name, { component });
      },
      removeComponent: (name) => {
        updateComponentConfig(name, { component: null, enabled: false });
      }
    }
  }), [uiConfig, activePlugins, updateConfig, updateComponentConfig]);

  return (
    <UIContext.Provider value={contextValue}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

// Plugin factory function
export const createPlugin = (id, options = {}) => {
  return {
    id,
    name: options.name || id,
    description: options.description || '',
    version: options.version || '1.0.0',
    enabled: options.enabled !== false, // enabled by default
    config: options.config || {},
    component: options.component || null,
    hooks: options.hooks || {},
    dependencies: options.dependencies || [],
    initialize: options.initialize || (() => {}),
    cleanup: options.cleanup || (() => {}),
    ...options
  };
};