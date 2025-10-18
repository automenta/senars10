import React, { useState, useMemo } from 'react';
import { createPanelStyle, createHeaderStyle, createContentStyle } from '../../utils/uiHelpers';

// Base component abstraction - optimized for performance and extensibility
const BaseComponent = ({
  title,
  children,
  className = '',
  style = {},
  headerStyle = {},
  contentStyle = {},
  loading = false,
  error = null,
  showHeader = true,
  expandable = false,
  defaultExpanded = false,
  onToggle = null,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Memoize content rendering for performance
  const content = useMemo(() => {
    if (error) return (
      <div style={{ color: 'red', padding: '10px' }}>
        Error: {error}
      </div>
    );

    if (loading) return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        Loading...
      </div>
    );

    return children;
  }, [children, error, loading]);

  const toggleExpanded = () => {
    if (!expandable) return;

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  // Memoize header styles for performance
  const headerStyles = useMemo(() => {
    if (!showHeader || !title) return null;

    const baseStyle = expandable ? {
      cursor: 'pointer',
      backgroundColor: isExpanded ? '#e7f1ff' : '#f8f9fa',
      border: `1px solid ${isExpanded ? '#0d6efd' : '#ced4da'}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    } : {};

    return createHeaderStyle({ ...headerStyle, ...baseStyle });
  }, [showHeader, title, expandable, isExpanded, headerStyle]);

  const header = useMemo(() => {
    if (!headerStyles) return null;

    return (
      <div style={headerStyles} onClick={expandable ? toggleExpanded : undefined}>
        <span>{title}</span>
        {expandable && <span>{isExpanded ? '▼' : '▶'}</span>}
      </div>
    );
  }, [headerStyles, title, expandable, isExpanded, toggleExpanded]);

  // Memoize content styles for performance
  const contentStyles = useMemo(() =>
    createContentStyle({
      ...contentStyle,
      ...(expandable && !isExpanded && { display: 'none' })
    }),
    [contentStyle, expandable, isExpanded]
  );

  return (
    <div
      className={`base-component ${className}`}
      style={createPanelStyle(style)}
      {...props}
    >
      {header}
      <div style={contentStyles}>{content}</div>
    </div>
  );
};

export default BaseComponent;