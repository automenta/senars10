import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Component registry - optimized for extensibility and performance
const ComponentRegistryContext = createContext();

export const useComponentRegistry = () => {
  const context = useContext(ComponentRegistryContext);
  if (!context) {
    throw new Error('useComponentRegistry must be used within a ComponentRegistryProvider');
  }
  return context;
};

// Component configuration interface for better type safety
const createComponentConfig = (config) => ({
  name: '',
  component: null,
  render: null,
  isActive: false,
  registeredAt: new Date(),
  activatedAt: null,
  deactivatedAt: null,
  metadata: {},
  dependencies: [],
  ...config
});

export const ComponentRegistryProvider = ({ children }) => {
  const [components, setComponents] = useState(new Map());
  const [activeComponents, setActiveComponents] = useState(new Set());

  const registerComponent = useCallback((componentName, componentConfig) => {
    setComponents(prev => {
      const newMap = new Map(prev);
      newMap.set(componentName, createComponentConfig({
        ...componentConfig,
        name: componentName
      }));
      return newMap;
    });
  }, []);

  const unregisterComponent = useCallback((componentName) => {
    setComponents(prev => {
      const newMap = new Map(prev);
      newMap.delete(componentName);
      return newMap;
    });

    setActiveComponents(prev => {
      const newSet = new Set(prev);
      newSet.delete(componentName);
      return newSet;
    });
  }, []);

  const activateComponent = useCallback((componentName) => {
    setComponents(prev => {
      const component = prev.get(componentName);
      if (!component) {
        throw new Error(`Component ${componentName} not found`);
      }

      const newMap = new Map(prev);
      newMap.set(componentName, {
        ...component,
        isActive: true,
        activatedAt: new Date()
      });
      return newMap;
    });

    setActiveComponents(prev => new Set(prev).add(componentName));
  }, []);

  const deactivateComponent = useCallback((componentName) => {
    setComponents(prev => {
      const component = prev.get(componentName);
      if (!component) return prev;

      const newMap = new Map(prev);
      newMap.set(componentName, {
        ...component,
        isActive: false,
        deactivatedAt: new Date()
      });
      return newMap;
    });

    setActiveComponents(prev => {
      const newSet = new Set(prev);
      newSet.delete(componentName);
      return newSet;
    });
  }, []);

  // Memoize computed values for performance
  const activeComponentsList = useMemo(() =>
    Array.from(activeComponents), [activeComponents]);

  const activeComponentsData = useMemo(() =>
    activeComponentsList.map(name => components.get(name)).filter(Boolean),
    [activeComponentsList, components]);

  const allComponentsList = useMemo(() =>
    Array.from(components.values()), [components]);

  const renderComponent = useCallback((componentName, props = {}) => {
    const component = components.get(componentName);
    if (!component?.isActive) return null;

    if (component.render) {
      return component.render(props);
    }

    if (component.component) {
      const Component = component.component;
      return <Component key={componentName} {...props} />;
    }

    return null;
  }, [components]);

  const getComponent = useCallback((componentName) =>
    components.get(componentName) || null, [components]);

  const getActiveComponents = useCallback(() =>
    activeComponentsData, [activeComponentsData]);

  const getAllComponents = useCallback(() =>
    allComponentsList, [allComponentsList]);

  const value = useMemo(() => ({
    registerComponent,
    unregisterComponent,
    activateComponent,
    deactivateComponent,
    renderComponent,
    getComponent,
    getActiveComponents,
    getAllComponents,
    activeComponents: activeComponentsList,
    totalComponents: components.size
  }), [
    registerComponent,
    unregisterComponent,
    activateComponent,
    deactivateComponent,
    renderComponent,
    getComponent,
    getActiveComponents,
    getAllComponents,
    activeComponentsList,
    components.size
  ]);

  return (
    <ComponentRegistryContext.Provider value={value}>
      {children}
    </ComponentRegistryContext.Provider>
  );
};

export default ComponentRegistryProvider;