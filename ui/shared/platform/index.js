// ui/shared/platform/index.js
// Platform abstraction layer using separate platform files for build safety
// The correct file will be selected based on the execution context

import React from 'react';

const h = React.createElement;

// Detect platform at runtime for dev purposes
export const PLATFORM = typeof window === 'undefined' ? 'cli' : 'web';

// Export the event mapping function
export const eventMap = (event) => {
  if (PLATFORM === 'cli') {
    return event === 'onPress' ? 'onPress' : event;
  } else {
    return event === 'onPress' ? 'onClick' : event;
  }
};

// For now, export web components by default for build compatibility
// In a real implementation, you would use build-time configuration to select the right file
export const Box = 'div';
export const Text = 'span';
export const Button = 'button';
export const Grid = 'div';
export const Tabs = 'nav';
export const Modal = 'dialog';

export { h };