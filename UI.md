# SeNARS UI Phased Development Plan

This document outlines a phased plan for developing the SeNARS Terminal and Web UIs. The goal is to ensure a structured approach, starting with a solid foundation and iteratively adding features. Each phase includes actionable, checkbox-based tasks.

---

### Phase 1: Project Setup & Foundation

**Goal:** Restructure the project, install dependencies, and create the core platform abstraction layer.

- [ ] **Project Restructuring**
    - [ ] Move all files from `src/` to a new `core/` directory.
    - [ ] Create the main `ui/` directory.
    - [ ] Create subdirectories: `ui/shared`, `ui/cli`, `ui/web`.
    - [ ] Create deeper structure: `ui/shared/components`, `ui/shared/hooks`, `ui/shared/models`, `ui/shared/utils`, `ui/shared/platform`, `ui/shared/styles`.
- [ ] **Configuration**
    - [ ] Add `dist/`, `.vite/`, and `.env` to `.gitignore`.
    - [ ] Update `package.json` with new dependencies:
        - `dependencies`: `react`, `react-dom`, `blessed`, `react-blessed`, `zod`
        - `devDependencies`: `vite`, `@vitejs/plugin-react`, `nodemon`
    - [ ] Run `npm install` to fetch the new packages.
    - [ ] Add new scripts to `package.json`: `dev:cli`, `dev:web`, `build:web`.
    - [ ] Update the `test` script in `package.json` to `NODE_NO_WARNINGS=1 NODE_OPTIONS=--experimental-vm-modules npx jest`.
    - [ ] Create `vite.config.js` at the project root for the web build process.
- [ ] **Platform Abstraction**
    - [ ] Implement the initial platform abstraction layer in `ui/shared/platform/index.js`.
    - [ ] Use a runtime check (`typeof window`) and dynamic `import()` to load `react-blessed` only for the CLI platform.
    - [ ] Export a shared `h` (React.createElement) alias, platform-specific components (`Box`, `Text`, etc.), and an `eventMap` function.
- [ ] **Development Concerns**
    - [ ] **Note:** The platform abstraction uses top-level `await`. Confirm the project's target Node.js version supports this. If not, the logic should be wrapped in an async IIFE in the CLI entry point.

---

### Phase 2: Core Components & Theming

**Goal:** Build the first set of reusable, cross-platform components and a robust styling system.

- [ ] **Theming & Styling**
    - [ ] Create the shared theme object in `ui/shared/styles/theme.js`.
    - [ ] **Crucial:** Implement the `styleMapper` utility in `ui/shared/utils/styleMapper.js`. This function will translate shared style props (e.g., `{ bg, fg }`) into platform-native style objects (CSS-in-JS for web, blessed styles for CLI).
- [ ] **Core Components**
    - [ ] Create `ui/shared/components/Text.js`. This component must handle the difference between web (`children`) and blessed (`content`) for rendering text.
    - [ ] Create `ui/shared/components/Box.js`, integrating the `styleMapper` for styling.
    - [ ] Create `ui/shared/components/Button.js`, using the `styleMapper` and the `eventMap` from the platform layer to handle clicks/presses.
- [ ] **Best Practices & Performance**
    - [ ] Wrap all shared components in `React.memo()` to prevent unnecessary re-renders, which is especially critical for `react-blessed` performance.

---

### Phase 3: Application Shell & Entry Points (MVI)

**Goal:** Create the entry points for both platforms to render a static "Minimum Viable UI" and validate the core architecture.

- [ ] **Shared Application Shell**
    - [ ] Create the main shared application component in `ui/shared/App.js`.
    - [ ] Initially, render a static layout using the `Box`, `Text`, and `Button` components to confirm they work correctly on both platforms.
- [ ] **Platform Entry Points**
    - [ ] Create the CLI entry point at `ui/cli/index.js`. It should initialize a `blessed` screen and use `react-blessed` to render the shared `App` component.
    - [ ] Add key bindings to the blessed screen for exiting the application (`q`, `Ctrl-C`).
    - [ ] Create the web entry point at `ui/web/index.js` and a minimal `ui/web/index.html` with a `<div id="root"></div>`. The script should use `react-dom/client` to render the shared `App` component.
- [ ] **Verification**
    - [ ] Create `examples/cli-demo.js` and `examples/web-demo.js` to serve as launchers for the UIs.
    - [ ] **Milestone:** After this phase, both `npm run dev:cli` and `npm run dev:web` should successfully launch and display a basic, static UI without errors.

---

### Phase 4: State Management & Core Integration

**Goal:** Connect the UI to the SeNARS core to display real-time data.

- [ ] **Data Contracts**
    - [ ] Define data schemas using Zod in `ui/shared/models/` (e.g., `AgentSchema.js`, `TaskSchema.js`). This creates a reliable contract between the core and the UI.
    - [ ] **Core Dev Task:** Ensure the SeNARS core emits events (e.g., `agentUpdate`, `reasoningStep`) on a shared `EventBus`. Validate data against Zod schemas before emitting to prevent UI errors.
- [ ] **Reactive Hooks**
    - [ ] Create the `useAgentState.js` hook in `ui/shared/hooks/` to listen for `agentUpdate` events and manage the list of agents.
    - [ ] Create the `useReasoningTrace.js` hook to listen for `reasoningStep` events and maintain a list of recent trace steps.
- [ ] **UI Integration**
    - [ ] Update `ui/shared/App.js` to use the `useAgentState` hook and dynamically render the list of agents.
    - [ ] **Concern:** Double-check that the import path to the core `EventBus` (e.g., `../../core/util/EventBus.js`) is correct from within the hooks.

---

### Phase 5: Advanced Components & UI Features

**Goal:** Build out the remaining UI components and enhance the user experience on both platforms.

- [ ] **Advanced Components**
    - [ ] Implement a `Grid.js` component for creating layouts.
    - [ ] Implement `Tabs.js` for tabbed navigation.
    - [ ] Implement `Modal.js` for displaying modal dialogs.
    - [ ] Implement a `LogView.js` component for displaying the reasoning trace from `useReasoningTrace`, ensuring it is scrollable.
- [ ] **CLI User Experience (UX)**
    - [ ] Ensure the main blessed screen is configured with `smartCSR: true` and `mouse: true`.
    - [ ] Add a global `resize` event handler to the screen to ensure it re-renders on terminal resize.
    - [ ] For any list-based views (like the reasoning trace), ensure `scrollable: true` and `alwaysScroll: true` are set for a good user experience.
- [ ] **Web User Experience (UX) & Accessibility (a11y)**
    - [ ] Enhance shared components to accept and pass through accessibility props like `aria-label`.
    - [ ] Ensure interactive elements like buttons are keyboard-navigable (`tabIndex: 0`) and have appropriate ARIA roles.

---

### Phase 6: Finalization, Testing & Documentation

**Goal:** Solidify the UI with tests, confirm the build process is safe, and document its usage.

- [ ] **Testing**
    - [ ] If desired, add `@testing-library/react` to `devDependencies`.
    - [ ] Create test utilities in `tests/ui/testUtils.js` to help manage platform-specific test logic (e.g., skipping certain tests in a JSDOM environment).
    - [ ] Write unit tests for shared components, hooks, and utility functions.
- [ ] **Build & Verification**
    - [ ] Run `npm run build:web` to generate a production build for the web UI.
    - [ ] **Crucial:** Inspect the final web asset bundle (e.g., using `vite --debug`) to confirm that CLI packages like `blessed` have been successfully tree-shaken and are not included.
    - [ ] **Contingency Plan:** If the build contains CLI code, refactor the platform abstraction to use separate, explicit files (`platform/web.js`, `platform/cli.js`) to guarantee import isolation.
- [ ] **Documentation**
    - [ ] Add a "UI Development" section to the root `README.md`.
    - [ ] Document the `npm run dev:cli` and `npm run dev:web` commands.
    - [ ] Provide brief instructions on how to interact with the CLI (e.g., navigation, quitting).
- [ ] **Final Review**
    - [ ] Perform manual end-to-end testing on both the CLI (in multiple terminal emulators) and the web UI (in multiple browsers).

----

# The specification, for reference:

### ✅ SeNARS UIs (Terminal and Web)

#### 🎯 Goals
- Add **CLI (terminal)** and **web** UIs to the existing `core/` (formerly `src/`) with **maximal code sharing** (~80%).
- Use **zero JSX** → only `React.createElement` aliased as `h`.
- **No TypeScript** → pure JavaScript with JSDoc for clarity (optional).
- **ES modules only** (`import`/`export`).
- Leverage existing `EventBus` (or `mitt`/`eventemitter3`) for real-time updates.
- Prioritize **performance**, **accessibility**, and **maintainability**.

---

### 1. Project Structure (ESM-Compliant)

Move core logic to `core/`, add `ui/` with shared abstractions.

```
.
├── agent.json
├── AGENTS.md
├── babel.config.js          # unchanged (already supports ESM via preset-env)
├── benchmarks/
├── DESIGN.md
├── docs/
├── examples/
│   ├── cli-demo.js           # import '../ui/cli/index.js'
│   └── web-demo.js           # serves ui/web/index.html
├── jest.config.cjs           # unchanged (already handles ESM via NODE_OPTIONS)
├── LICENSE
├── package.json              # ← updated below
├── PLAN.md
├── README.md                 # add UI setup/run instructions
├── core/                     # ← moved from src/
│   └── ...                   # all original files (NAR.js, Agent.js, etc.)
├── ui/
│   ├── shared/
│   │   ├── components/       # Box.js, Button.js, Grid.js, Modal.js, etc.
│   │   ├── hooks/            # useAgentState.js, useReasoningTrace.js
│   │   ├── models/           # TaskSchema.js (Zod)
│   │   ├── utils/            # debounce.js, validation.js
│   │   ├── platform/         # index.js: platform adapters
│   │   └── styles/           # theme.js
│   ├── cli/
│   │   └── index.js          # CLI entry
│   └── web/
│       ├── index.js          # Web entry (client-side)
│       └── index.html        # minimal root div
├── tests/
│   └── ui/                   # shared/, cli/, web/ tests
├── vite.config.js            # for web dev/build
├── .env                      # optional: PLATFORM=web|cli (for dev scripts only)
└── .gitignore                # add dist/, .vite/, etc.
```

> ✅ **Note**: No `tsconfig.json`, no `.d.ts`, no type-checking. Pure JS.

---

### 2. Dependencies (Add to `package.json`)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "blessed": "^0.1.81",
    "react-blessed": "^0.4.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "nodemon": "^3.1.9"
  }
}
```

> 💡 Keep it lean. No Redux, no heavy UI libs. `react-blessed` is sufficient for TUI.

Run:
```bash
npm install react react-dom blessed react-blessed zod
npm install -D vite @vitejs/plugin-react nodemon
```

---

### 3. Platform Abstraction (`ui/shared/platform/index.js`)

Use **dynamic imports** to avoid bundling CLI code in web.

```js
// ui/shared/platform/index.js
import React from 'react';

const h = React.createElement;

// Detect platform at runtime (for dev only; production uses separate entries)
const PLATFORM = typeof window === 'undefined' ? 'cli' : 'web';

let adapters;
let eventMap;

if (PLATFORM === 'cli') {
  // Lazy-load CLI deps only when needed
  const blessedComponents = await import('react-blessed');
  adapters = {
    Box: blessedComponents.createBlessedComponent('box'),
    Text: blessedComponents.createBlessedComponent('text'),
    Button: blessedComponents.createBlessedComponent('button'),
    Grid: blessedComponents.createBlessedComponent('table'),
    Tabs: blessedComponents.createBlessedComponent('listbar'),
    Modal: blessedComponents.createBlessedComponent('box'),
  };
  eventMap = (event) => (event === 'onPress' ? 'onPress' : event);
} else {
  // Web
  adapters = {
    Box: 'div',
    Text: 'span',
    Button: 'button',
    Grid: 'div', // styled as CSS grid
    Tabs: 'nav',
    Modal: 'dialog',
  };
  eventMap = (event) => (event === 'onPress' ? 'onClick' : event);
}

export { h, PLATFORM, eventMap, ...adapters };
```

> ⚠️ **Caveat**: Top-level `await` is valid in modules. For older Node, wrap in IIFE or use async init in CLI entry.

---

### 4. Shared Components (`ui/shared/components/Button.js`)

```js
// ui/shared/components/Button.js
import { h, Button as PlatformButton, eventMap } from '../platform/index.js';
import theme from '../styles/theme.js';

export default function Button({ label, onPress, primary = false, ...props }) {
  const style = primary
    ? { bg: theme.palette.primary, fg: theme.palette.fg } // CLI
    : {}; // Web: could map to CSS later

  return h(PlatformButton, {
    ...props,
    [eventMap('onPress')]: onPress,
    content: label, // blessed uses 'content'; web uses children
    mouse: true,
    keys: true,
    style,
  });
}
```

> 🔁 **Strategy**: Use `content` for CLI text; for web, pass `label` as child. Adjust in platform layer if needed.

---

### 5. Shared Hooks & Logic

```js
// ui/shared/hooks/useAgentState.js
import { useState, useEffect } from 'react';
import { eventBus } from '../../core/util/EventBus.js'; // adjust path

export function useAgentState() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const handler = (data) => setAgents(data);
    eventBus.on('agentUpdate', handler);
    return () => eventBus.off('agentUpdate', handler);
  }, []);

  return { agents };
}
```

> ✅ Assumes your core already emits `'agentUpdate'`. If using `mitt`, replace `.on`/`.off`.

---

### 6. Entry Points

#### CLI (`ui/cli/index.js`)
```js
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
});

// Render app
createBlessedRenderer(blessed)(h(App), screen);

// Exit on q or Ctrl-C
screen.key(['q', 'C-c'], () => process.exit(0));
```

#### Web (`ui/web/index.js`)
```js
// ui/web/index.js
import { createRoot } from 'react-dom/client';
import { h } from '../shared/platform/index.js';
import App from '../shared/App.js';

const root = createRoot(document.getElementById('root'));
root.render(h(App));
```

> ✅ No `process.env.PLATFORM` needed—platform is auto-detected via `typeof window`.

---

### 7. Root App (`ui/shared/App.js`)
```js
// ui/shared/App.js
import { h, Box, Text } from './platform/index.js';
import Button from './components/Button.js';
import { useAgentState } from './hooks/useAgentState.js';
import { useState } from 'react';

export default function App() {
  const { agents } = useAgentState();
  const [selected, setSelected] = useState(null);

  return h(Box, { border: 'line', label: 'SeNARS UI' }, [
    h(Text, {}, `Agents: ${agents.length}`),
    h('div', {}, agents.map(a => h(Text, {}, a.id))), // placeholder
    h(Button, { label: 'Refresh', onPress: () => console.log('refresh') }),
  ]);
}
```

---

### 8. Styling (`ui/shared/styles/theme.js`)
```js
// ui/shared/styles/theme.js
export default {
  palette: {
    primary: '#1e90ff',
    bg: '#000',
    fg: '#fff',
  },
  spacing: (n) => n * 4,
};
```

> 🎨 For web, you’ll eventually need a `styleMapper` to convert `{ bg, fg }` → `{ backgroundColor, color }`. For now, keep styles minimal or platform-specific.

---

### 9. Scripts (`package.json` additions)

```json
{
  "scripts": {
    "dev:cli": "nodemon --watch ui --watch core -e js --exec \"node ui/cli/index.js\"",
    "dev:web": "vite ui/web",
    "build:web": "vite build --outDir dist/web",
    "test": "NODE_NO_WARNINGS=1 NODE_OPTIONS=--experimental-vm-modules npx jest"
  }
}
```

> ✅ `nodemon` watches JS files; Vite serves web with HMR.

---

### 10. Vite Config (`vite.config.js`)
```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic', // required for h()
    }),
  ],
  root: 'ui/web',
  build: {
    outDir: '../../dist/web',
    rollupOptions: {
      input: 'ui/web/index.html',
    },
  },
});
```

---

### ✅ Final Notes

- **No TypeScript**: All code is standard JavaScript (ESM).
- **Zero JSX**: Only `h()` is used.
- **Platform detection** is runtime-based but safe (`typeof window`).
- **Dynamic imports** prevent CLI code from entering web bundles.
- **Testing**: Use existing Jest setup; add `@testing-library/react` if needed.
- **Performance**: Lazy-load heavy viz only when needed.

----

Below are **practical, battle-tested enhancements and implementation tips** tailored to your SeNARS project (ESM, JavaScript, no TypeScript, NARS core) that will **accelerate development, prevent common pitfalls, and improve UX consistency** across terminal and web.

---

### 🔧 1. **Refine Platform Abstraction: Handle `children` vs `content`**

Blessed uses `content` for text; React DOM uses `children`. Shared components must reconcile this.

**Solution**: Normalize in the platform layer or component.

```js
// ui/shared/components/Text.js
import { h, Text as PlatformText, PLATFORM } from '../platform/index.js';

export default function Text({ children, ...props }) {
  if (PLATFORM === 'cli') {
    return h(PlatformText, { ...props, content: String(children) });
  }
  return h(PlatformText, props, children);
}
```

> ✅ Use this pattern for **all text-bearing components** (`Button`, `Box`, etc.).

---

### 🎨 2. **Style Mapper Utility (Critical for Shared Theming)**

Create a helper to translate shared style props → platform-native styles.

```js
// ui/shared/utils/styleMapper.js
import theme from '../styles/theme.js';

export function mapStyle(style, platform) {
  if (!style) return {};

  if (platform === 'cli') {
    // Blessed: bg, fg, bold, etc.
    return {
      bg: style.bg || theme.palette.bg,
      fg: style.fg || theme.palette.fg,
      bold: style.bold,
      // ... other blessed attrs
    };
  }

  // Web: CSS-in-JS
  return {
    backgroundColor: style.bg || theme.palette.bg,
    color: style.fg || theme.palette.fg,
    fontWeight: style.bold ? 'bold' : 'normal',
    padding: style.p ? `${style.p}px` : undefined,
    margin: style.m ? `${style.m}px` : undefined,
  };
}
```

Then in components:
```js
// Button.js
import { mapStyle } from '../utils/styleMapper.js';
import { h, Button as PlatformButton, eventMap, PLATFORM } from '../platform/index.js';

export default function Button({ label, onPress, style = {}, ...props }) {
  const resolvedStyle = mapStyle({ ...style, bg: style.bg || (primary ? theme.palette.primary : undefined) }, PLATFORM);

  if (PLATFORM === 'cli') {
    return h(PlatformButton, {
      ...props,
      [eventMap('onPress')]: onPress,
      content: label,
      mouse: true,
      keys: true,
      style: resolvedStyle,
    });
  }

  return h(PlatformButton, {
    ...props,
    [eventMap('onPress')]: onPress,
    style: resolvedStyle,
  }, label);
}
```

> 💡 This enables **truly shared style logic** without platform leaks.

---

### ⚡ 3. **Optimize CLI Performance: Use `smartCSR` and Avoid Re-renders**

- Always enable `smartCSR: true` in `blessed.screen()` → reduces terminal redraws.
- Wrap shared components in `React.memo()` to prevent unnecessary Blessed re-renders:

```js
// Button.js
import React from 'react';
// ... other imports

const ButtonImpl = ({ label, onPress, primary = false, ...props }) => { /* ... */ };

export default React.memo(ButtonImpl);
```

> 📉 Blessed re-renders are expensive. Memoization is essential.

---

### 🧪 4. **Testing Strategy for Shared UI**

Add lightweight test helpers:

```js
// tests/ui/testUtils.js
export const isWeb = typeof window !== 'undefined';
export const isCLI = !isWeb;

// Skip CLI tests in JSDOM
export const skipIfCLI = () => (isCLI ? test.skip : test);
```

Example test:
```js
// tests/ui/shared/Button.test.js
import { render } from '@testing-library/react';
import Button from '../../../ui/shared/components/Button.js';
import { isWeb } from '../testUtils.js';

test('renders label', () => {
  const { container } = render(Button({ label: 'Test', onPress: () => {} }));
  if (isWeb) {
    expect(container.textContent).toBe('Test');
  }
  // CLI: harder to test; consider snapshot or manual validation
});
```

> 🧩 For CLI, rely on **integration demos** (`examples/cli-demo.js`) and **manual testing in real terminals** (iTerm, GNOME Terminal).

---

### 🌐 5. **Web Accessibility (a11y) Essentials**

Since you’re using semantic abstractions:
- Add `role`, `aria-label`, `tabIndex` in web adapters.
- Example in `platform/index.js` (web branch):

```js
adapters = {
  Button: ({ onPress, ...props }) => 
    h('button', { 
      ...props, 
      onClick: onPress,
      tabIndex: 0,
      role: 'button'
    }),
  // ...
};
```

Or better: enhance shared `Button` to accept `aria-label` and pass through.

> ✅ This ensures keyboard nav and screen reader support.

---

### 📦 6. **Bundle Size & Build Safety**

- **Vite** will **not bundle `blessed`** into web output because it’s only imported in the CLI branch (thanks to `typeof window` guard + dynamic import).
- Verify with: `npx vite build --debug` → check `dist/web/assets/*.js` for `blessed` references.
- If issues arise, **split platform modules**:

```js
// ui/shared/platform/web.js
export { createElement as h } from 'react';
export const Box = 'div';
// ...

// ui/shared/platform/cli.js
import React from 'react';
import { createBlessedComponent } from 'react-blessed';
export const h = React.createElement;
export const Box = createBlessedComponent('box');
// ...

// ui/shared/platform/index.js
export * from (typeof window === 'undefined' 
  ? './cli.js' 
  : './web.js');
```

> 🔒 This guarantees **zero cross-platform leakage** at build time.

---

### 🖥️ 7. **CLI-Specific UX Tips**

- Enable **mouse support** globally in Blessed screen:
  ```js
  const screen = blessed.screen({ ..., mouse: true });
  ```
- Handle **resize events**:
  ```js
  screen.on('resize', () => screen.render());
  ```
- Use `scrollable: true` on large lists.
- For **reasoning traces**, use a `log` box with `scrollable: true, alwaysScroll: true`.

---

### 🧠 8. **Integrate with SeNARS Core Smoothly**

Assume your core emits events like:
```js
eventBus.emit('agentUpdate', agents);
eventBus.emit('reasoningStep', { step, timestamp });
```

Then in shared hooks:
```js
// useReasoningTrace.js
export function useReasoningTrace() {
  const [trace, setTrace] = useState([]);

  useEffect(() => {
    const handler = (step) => setTrace(t => [...t, step].slice(-100)); // cap at 100
    eventBus.on('reasoningStep', handler);
    return () => eventBus.off('reasoningStep', handler);
  }, []);

  return trace;
}
```

> 🔄 This gives **real-time, reactive UIs without polling**.

---

### 📄 9. **Documentation Snippet for `README.md`**

Add this to your README:

```md
## UI Development

### Terminal UI
```bash
npm run dev:cli
```
- Navigate with arrow keys, press buttons with `Enter`.
- Quit with `q` or `Ctrl+C`.

### Web UI
```bash
npm run dev:web
```
- Opens at `http://localhost:5173`
- Responsive grid view of agents and reasoning trace.

> Both UIs share >80% code via `ui/shared/`.
```

----

### ✅ **1. Start with a Minimal Viable UI (MVI)**
Don’t build all components at once. Implement in this order:
1. **Platform abstraction** (`ui/shared/platform/index.js`)
2. **Text + Box + Button** (with style mapping)
3. **CLI entry** that renders a static "Hello SeNARS" screen
4. **Web entry** that renders the same
5. **Hook** that listens to one core event (e.g., `agentUpdate`)
6. **Grid** showing live agents

> 🚀 This validates your architecture in <1 day and surfaces bundling/runtime issues early.

---

### 🔒 **2. Guard Against Common ESM Pitfalls**
- **File extensions are required** in imports (Node/Vite strict mode):
  ```js
  // ✅ Good
  import App from '../shared/App.js';
  // ❌ Bad
  import App from '../shared/App';
  ```
- **Use `.js` even for JSX-like files** (since you’re not using `.jsx`).
- In `vite.config.js`, ensure:
  ```js
  optimizeDeps: { include: ['react', 'react-dom'] }
  ```

> 💡 Add an `.editorconfig` or ESLint rule to enforce `.js` extensions if needed.

---

### 📊 **3. Plan for Core-UI Data Contracts**
Since you’re using Zod in `models/`, **define schemas for all core events**:
```js
// ui/shared/models/Agent.js
import { z } from 'zod';

export const AgentSchema = z.object({
  id: z.string(),
  status: z.enum(['idle', 'reasoning', 'blocked']),
  tasks: z.array(z.string()),
});

// In core, validate before emitting:
// eventBus.emit('agentUpdate', AgentSchema.parse(agent));
```

> 🔗 This prevents UI crashes from malformed core data and documents your event API.
