import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { THEME } from '../constants';

const DraggablePanel = ({ id, children, activeId }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isOver } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: isOver ? `2px dashed ${THEME.colors.primary}` : `2px solid transparent`,
    borderRadius: THEME.borderRadius,
    margin: `${THEME.spacing.sm} 0`,
    opacity: id === activeId ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

export default DraggablePanel;
