// ui/shared/components/Box.js
import React from 'react';
import { h } from '../platform/index.js';
import { mapStyle } from '../utils/styleMapper.js';

// Detect platform at runtime
const PLATFORM = typeof window === 'undefined' ? 'cli' : 'web';

function Box({ children, style = {}, ...props }) {
  const resolvedStyle = mapStyle(style, PLATFORM);

  if (PLATFORM === 'cli') {
    // Dynamically import react-blessed components for CLI
    const { createBlessedComponent } = require('react-blessed');
    const PlatformBox = createBlessedComponent('box');
    return h(PlatformBox, { ...props, style: resolvedStyle, content: children });
  } else {
    // Use standard HTML element for web
    return h('div', { ...props, style: resolvedStyle }, children);
  }
}

export default React.memo(Box);