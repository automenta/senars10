// Consolidated sortable panel component to eliminate duplication between TasksPanel and ConceptsPanel
import React, { useState, useEffect } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableItem from './SortableItem';
import { createFlexLayout } from '../../utils/uiHelpers';

const SortablePanel = ({
  items = [],
  type = 'item',
  title = 'Items',
  emptyIcon = '📋',
  emptyMessage = 'No items available',
  emptyDescription = 'Items will appear here as they are created',
  onUpdateItem,
  onDeleteItem,
  renderExpandedContent,
  className = ''
}) => {
  const [displayItems, setDisplayItems] = useState(items || []);
  const [expandedItems, setExpandedItems] = useState(new Set());

  useEffect(() => {
    setDisplayItems(items || []);
  }, [items]);

  const handlePriorityChange = (item, newPriority) => {
    onUpdateItem?.({ ...item, priority: newPriority, lastModified: Date.now() });
  };

  const handleDeleteItem = (item) => {
    onDeleteItem?.(item);
  };

  const handleToggleExpand = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id === over.id) return;

    const oldIndex = displayItems.findIndex(item => (item.id || displayItems.indexOf(item)) === active.id);
    const newIndex = displayItems.findIndex(item => (item.id || displayItems.indexOf(item)) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      setDisplayItems(arrayMove(displayItems, oldIndex, newIndex));
    }
  };

  return (
    <div className={`${type}s-tree ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={createFlexLayout('row', 'space-between', 'center', {
        padding: '5px 10px',
        backgroundColor: '#e9ecef',
        borderBottom: '1px solid #ccc',
        fontSize: '12px',
        fontWeight: 'bold'
      })}>
        <div>
          {title} ({displayItems.length})
        </div>
      </div>

      {/* Content */}
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', position: 'relative' }}>
          <SortableContext
            items={displayItems.map(item => item.id || displayItems.indexOf(item))}
            strategy={verticalListSortingStrategy}
          >
            {displayItems.length > 0 ? (
              displayItems.map((item, index) => (
                <div key={`${item.id || index}-container`} style={{ position: 'relative' }}>
                  <SortableItem
                    item={item}
                    index={index}
                    type={type}
                    onPriorityChange={handlePriorityChange}
                    onDelete={handleDeleteItem}
                    onToggleExpand={() => handleToggleExpand(item.id || index)}
                    isExpanded={expandedItems.has(item.id || index)}
                    renderExpandedContent={renderExpandedContent}
                  />
                </div>
              ))
            ) : (
              <div style={createFlexLayout('column', 'center', 'center', {
                height: '100%',
                color: '#999',
                fontStyle: 'italic',
                textAlign: 'center'
              })}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>{emptyIcon}</div>
                <div>{emptyMessage}</div>
                <div style={{ fontSize: '10px', marginTop: '5px' }}>
                  {emptyDescription}
                </div>
              </div>
            )}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
};

export default SortablePanel;