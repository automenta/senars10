// ui/shared/App.js
import React, { useState } from 'react';
import { h } from './platform/index.js';
import Box from './components/Box.js';
import Text from './components/Text.js';
import Button from './components/Button.js';
import { useAgentState } from './hooks/useAgentState.js';
import { useReasoningTrace } from './hooks/useReasoningTrace.js';

export default function App() {
  const { agents } = useAgentState();
  const reasoningTrace = useReasoningTrace();
  const [count, setCount] = useState(0);

  return h(Box, { border: 'line', label: 'SeNARS UI' }, [
    h(Text, {}, 'Welcome to SeNARS UI'),
    h(Text, {}, `Count: ${count}`),
    h(Button, { 
      label: 'Increment', 
      onPress: () => setCount(count + 1),
      primary: true
    }),
    h(Button, { 
      label: 'Reset', 
      onPress: () => setCount(0)
    }),
    h(Text, {}, `Active Agents: ${agents.length}`),
    h(Box, { style: { p: 1, bg: '#222' } }, [
      ...agents.map(agent => 
        h(Text, {}, `- ${agent.name} (${agent.status})`)
      )
    ]),
    h(Text, {}, `Recent Reasoning Steps: ${reasoningTrace.length}`),
    h(Box, { style: { p: 1, bg: '#222' } }, [
      ...reasoningTrace.slice(-5).map((step, idx) => 
        h(Text, {}, `${idx+1}. ${step.content}`)
      ) // Show only the last 5 steps
    ])
  ]);
}