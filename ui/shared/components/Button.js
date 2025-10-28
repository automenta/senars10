// ui/shared/components/Button.js
import React from 'react';
import { h } from '../platform/index.js';
import { mapStyle } from '../utils/styleMapper.js';
import theme from '../styles/theme.js';

// Detect platform at runtime
const PLATFORM = typeof window === 'undefined' ? 'cli' : 'web';
const eventMap = (event) => (event === 'onPress' ? (PLATFORM === 'cli' ? 'onPress' : 'onClick') : event);

function Button({ label, onPress, primary = false, style = {}, ...props }) {
  const resolvedStyle = mapStyle({ 
    ...style, 
    bg: style.bg || (primary ? theme.palette.primary : undefined) 
  }, PLATFORM);

  if (PLATFORM === 'cli') {
    // Dynamically import react-blessed components for CLI
    const { createBlessedComponent } = require('react-blessed');
    const PlatformButton = createBlessedComponent('button');
    return h(PlatformButton, {
      ...props,
      [eventMap('onPress')]: onPress,
      content: label,
      mouse: true,
      keys: true,
      style: resolvedStyle,
    });
  } else {
    // Use standard HTML element for web
    return h('button', {
      ...props,
      [eventMap('onPress')]: onPress,
      style: resolvedStyle,
    }, label);
  }
}

export default React.memo(Button);