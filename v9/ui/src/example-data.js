// ui/src/example-data.js

import { randomUUID } from 'crypto';

export const initialTasks = [
  { id: randomUUID(), content: '(a --> b).', priority: 0.9, status: 'Input', type: 'Input' },
  { id: randomUUID(), content: '(b --> c).', priority: 0.8, status: 'Input', type: 'Input' },
  { id: randomUUID(), content: '(c --> d).', priority: 0.7, status: 'Input', type: 'Input' },
  { id: randomUUID(), content: 'What is the relationship between a and d?', priority: 0.6, status: 'Pending', type: 'Question' },
  { id: randomUUID(), content: 'Analyze the chain relationship', priority: 0.5, status: 'Pending', type: 'Operation' },
  { id: randomUUID(), content: 'Derive transitive relationships', priority: 0.4, status: 'Pending', type: 'Operation' },
];

export const initialConcepts = [
  { id: randomUUID(), content: 'a' },
  { id: randomUUID(), content: 'b' },
  { id: randomUUID(), content: 'c' },
  { id: randomUUID(), content: 'd' },
  { id: randomUUID(), content: 'transitivity' },
];

export const initialLogs = [
  { id: randomUUID(), message: 'System boot initiated' },
  { id: randomUUID(), message: 'Core modules loaded' },
  { id: randomUUID(), message: 'Initial knowledge base populated with (a --> b), (b --> c), (c --> d).' },
];
