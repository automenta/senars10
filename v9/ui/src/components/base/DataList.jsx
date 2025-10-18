import React, { useMemo } from 'react';
import BaseComponent from './BaseComponent';
import { createFlexLayout } from '../../utils/uiHelpers';

// Optimized data list component with better performance and extensibility
const DataList = ({
  items = [],
  renderItem,
  keyExtractor,
  title,
  emptyMessage = 'No items to display',
  loading = false,
  error = null,
  style = {},
  itemStyle = {},
  variant = 'default', // 'default', 'striped', 'bordered'
  ...props
}) => {
  // Memoize item rendering for performance
  const listContent = useMemo(() => {
    if (error) return null;

    if (items.length === 0) {
      return (
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          {emptyMessage}
        </div>
      );
    }

    const getItemStyle = (index) => {
      const baseStyle = {
        padding: '8px',
        ...itemStyle
      };

      switch (variant) {
        case 'striped':
          return {
            ...baseStyle,
            backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
          };
        case 'bordered':
          return {
            ...baseStyle,
            border: '1px solid #e0e0e0',
            borderRadius: '4px'
          };
        default:
          return baseStyle;
      }
    };

    return (
      <div style={{ ...createFlexLayout('column', 'stretch', 'stretch'), gap: '8px' }}>
        {items.map((item, index) => (
          <div
            key={keyExtractor ? keyExtractor(item, index) : index}
            style={getItemStyle(index)}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }, [items, renderItem, keyExtractor, error, emptyMessage, itemStyle, variant]);

  return (
    <BaseComponent
      title={title}
      loading={loading}
      error={error}
      style={style}
      {...props}
    >
      {listContent}
    </BaseComponent>
  );
};

export default DataList;