/**
 * Expandable Panel component for collapsible content sections
 * Now uses BaseComponent for consistency and reduced duplication
 */

import React from 'react';
import BaseComponent from './base/BaseComponent';

const ExpandablePanel = ({
  title,
  children,
  defaultExpanded = false,
  onToggle = null,
  triggerComponent = null,
  contentWrapperStyle = {},
  headerWrapperStyle = {},
  panelWrapperStyle = {},
  ...baseProps
}) => {
  return (
    <div style={{ margin: '5px 0', ...panelWrapperStyle }}>
      <BaseComponent
        title={title}
        expandable={true}
        defaultExpanded={defaultExpanded}
        onToggle={onToggle}
        headerStyle={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          ...headerWrapperStyle
        }}
        contentStyle={{
          marginTop: '5px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #ced4da',
          borderRadius: '4px',
          ...contentWrapperStyle
        }}
        {...baseProps}
      >
        {children}
      </BaseComponent>
      {triggerComponent}
    </div>
  );
};

export default ExpandablePanel;