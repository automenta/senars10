import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPriorityColor, getItemIcon, createButtonStyle, createFlexLayout } from '../../utils/uiHelpers';

const SortableItem = ({
  item,
  index,
  type = 'item',
  onPriorityChange,
  onDelete,
  onToggleExpand,
  isExpanded = false,
  renderExpandedContent
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id || index
  });

  const priorityColor = getPriorityColor(item.priority || 0.5);
  const itemIcon = getItemIcon(type);

  const baseStyle = createFlexLayout('row', 'flex-start', 'center', {
    padding: '6px 8px',
    margin: '2px 0',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'grab',
    transition: 'all 0.2s ease',
    minHeight: '36px'
  });

  const itemStyle = {
    ...baseStyle,
    ...(isExpanded ? { backgroundColor: '#e7f1ff', border: '1px solid #0d6efd' } : { backgroundColor: '#f8f9fa', border: '1px solid #ced4da' }),
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onToggleExpand?.();
  };

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      <span style={createFlexLayout('row', 'center', 'center', {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: `${priorityColor}20`,
        marginRight: '8px',
        fontSize: '12px',
        color: priorityColor
      })}>
        {itemIcon}
      </span>

      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: '500', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.content || item.name || item.id || `${type} ${index + 1}`}
        </div>
      </div>

      <div style={createFlexLayout('row', 'flex-end', 'center', { gap: '6px', minWidth: '120px' })}>
        <span style={{
          fontWeight: 'bold',
          color: priorityColor,
          fontSize: '11px',
          minWidth: '30px',
          textAlign: 'right'
        }}>
          {(item.priority || 0).toFixed(2)}
        </span>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={item.priority || 0.5}
          onChange={(e) => onPriorityChange?.(item, parseFloat(e.target.value))}
          style={{ width: '40px', cursor: 'ew-resize', height: '16px' }}
          title="Drag to reprioritize"
        />

        <button
          onClick={(e) => (e.stopPropagation(), onToggleExpand?.())}
          style={createButtonStyle(isExpanded ? 'primary' : 'secondary', {
            padding: '2px 6px',
            fontSize: '12px',
            borderRadius: '3px'
          })}
        >
          ⋯
        </button>
      </div>

      {isExpanded && (
        <div style={{
          position: 'absolute',
          left: '0',
          right: '0',
          top: '100%',
          backgroundColor: 'white',
          border: '1px solid #0d6efd',
          borderRadius: '4px',
          padding: '10px',
          zIndex: 20,
          marginTop: '2px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          fontSize: '11px'
        }}>
          <div style={createFlexLayout('row', 'space-between', 'center', { marginBottom: '8px' })}>
            <h4 style={{ margin: 0, color: '#0d6efd' }}>{type} Details</h4>
            <button
              onClick={() => onToggleExpand?.()}
              style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#6c757d' }}
            >
              ×
            </button>
          </div>

          {renderExpandedContent ? renderExpandedContent(item) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><strong>ID:</strong> {item.id || 'N/A'}</div>
              <div><strong>Type:</strong> {item.type || type}</div>
              <div><strong>Status:</strong> {item.status || 'N/A'}</div>
              <div><strong>Priority:</strong> {(item.priority || 0).toFixed(3)}</div>
              <div><strong>Created:</strong> {item.created || 'N/A'}</div>
              <div><strong>Content:</strong> {item.content || 'N/A'}</div>
            </div>
          )}

          <div style={createFlexLayout('row', 'flex-start', 'center', { gap: '8px', marginTop: '10px' })}>
            <button
              style={createButtonStyle('secondary', { padding: '4px 8px', fontSize: '10px', borderRadius: '3px' })}
              onClick={() => console.log(`Execute ${type}:`, item.id)}
            >
              ▶️ Execute
            </button>
            <button
              style={createButtonStyle('danger', { padding: '4px 8px', fontSize: '10px', borderRadius: '3px' })}
              onClick={() => onDelete?.(item)}
            >
              🗑️ Delete
            </button>
            <button
              style={createButtonStyle('success', { padding: '4px 8px', fontSize: '10px', borderRadius: '3px' })}
              onClick={() => onPriorityChange?.(item, Math.min(1, (item.priority || 0) + 0.1))}
            >
              ⬆️ Up Priority
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SortableItem;