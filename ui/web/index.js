// ui/web/index.js
import { createRoot } from 'react-dom/client';
import { h } from '../shared/platform/index.js';
import App from '../shared/App.js';

const root = createRoot(document.getElementById('root'));
root.render(h(App));