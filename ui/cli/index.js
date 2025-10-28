// ui/cli/index.js
import blessed from 'blessed';
import { createBlessedRenderer } from 'react-blessed';
import { h } from '../shared/platform/index.js';
import App from '../shared/App.js';

const screen = blessed.screen({
  smartCSR: true,
  fullUnicode: true,
  dockBorders: true,
  autoPadding: true,
  mouse: true,
});

// Render app
const renderer = createBlessedRenderer(blessed);
renderer(h(App), screen);

// Exit on q or Ctrl-C
screen.key(['q', 'C-c'], () => process.exit(0));

// Handle resize events
screen.on('resize', () => screen.render());