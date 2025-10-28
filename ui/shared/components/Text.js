// ui/shared/components/Text.js
import React from 'react';
import { h } from '../platform/index.js';

// Detect platform at runtime
const PLATFORM = typeof window === 'undefined' ? 'cli' : 'web';

function Text({ children, ...props }) {
  if (PLATFORM === 'cli') {
    // Dynamically import react-blessed components for CLI
    const { createBlessedComponent } = require('react-blessed');
    const PlatformText = createBlessedComponent('text');
    return h(PlatformText, { ...props, content: String(children) });
  } else {
    // Use standard HTML element for web
    return h('span', props, children);
  }
}

export default React.memo(Text);