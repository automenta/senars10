import React, { useState, useEffect } from 'react';
import SortablePanel from './base/SortablePanel';

// Concept-specific expanded content renderer
const renderConceptExpandedContent = (concept) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
    <div><strong>ID:</strong> {concept.id || 'N/A'}</div>
    <div><strong>Name:</strong> {concept.name || 'N/A'}</div>
    <div><strong>Type:</strong> {concept.type || 'concept'}</div>
    <div><strong>Priority:</strong> {(concept.priority || 0).toFixed(3)}</div>
    <div><strong>Content:</strong> {concept.content || 'N/A'}</div>
    <div><strong>Term Type:</strong> {concept.termType || 'N/A'}</div>
  </div>
);

const ConceptsPanel = ({ concepts = [], onUpdateConcept, onDeleteConcept, onAddConcept }) => {
  // The concepts prop is already sorted by the useCrdtWebSocket hook.
  // We keep a local state only to handle the drag-and-drop reordering visually.
  const [displayConcepts, setDisplayConcepts] = useState(concepts || []);

  useEffect(() => {
    setDisplayConcepts(concepts || []);
  }, [concepts]);

  return (
    <SortablePanel
      items={displayConcepts}
      type="concept"
      title={`Active Concepts (${displayConcepts.length})`}
      emptyIcon="🧠"
      emptyMessage="No active concepts"
      emptyDescription="Concepts will appear here as they are created or activated"
      onUpdateItem={onUpdateConcept}
      onDeleteItem={onDeleteConcept}
      renderExpandedContent={renderConceptExpandedContent}
    />
  );
};

export default ConceptsPanel;