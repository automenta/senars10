# UI Plan: Unified Web and CLI (Corrected)

This plan outlines a corrected, implementable architecture for a unified UI serving both web and command-line interfaces from a single codebase. It avoids synchronous module loading issues by isolating the asynchronous `import('ink')` to the CLI entry point.

---

## Core Principles
- **Single Codebase**: Shared components and hooks for both platforms.
- **Platform Abstraction**: Primitives are defined synchronously for the web and overridden at runtime for the CLI.
- **ESM Native**: No `require()` or bundler hacks.
- **Developer Experience**: Hot reloading for both web and CLI.

---

## 1. Dependencies

<<<<<<< HEAD
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

# UI Specification (for reference)

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
=======
>>>>>>> 007bc39 (planning)
```bash
# Core dependencies
npm i react ink react-hook-form zod

# Development dependencies
npm i -D vite @vitejs/plugin-react nodemon
```

---

## 2. Project Structure

```
ui/
├── shared/
│   ├── components/     # Shared components (Button, Grid, etc.)
│   ├── hooks/          # Shared hooks
│   ├── platform/       # Synchronous platform module
│   └── App.js          # Root application component
├── cli/
│   └── index.js        # CLI entry point (imports and patches Ink)
└── web/
    ├── index.html
    ├── index.js        # Web entry point
    └── vite.config.js  # Vite configuration
```

---

## 3. Platform Abstraction (`ui/shared/platform/index.js`)

This module is fully synchronous and defaults to web primitives.

```js
// ui/shared/platform/index.js
import { createElement as h } from 'react';

export const PLATFORM = process.env.PLATFORM || 'web';

// Default to web primitives. These will be monkey-patched by the CLI entry point.
export let Box = 'div';
export let Text = 'span';
export let Newline = 'br';

// Re-export shared components
export { default as Button } from '../components/Button.js';
export { default as Grid } from '../components/Grid.js';
export { default as Modal } from '../components/Modal.js';
export { default as Tabs } from '../components/Tabs.js';

export { h };
```

---

## 4. CLI Entry Point (`ui/cli/index.js`)

This is the **only** place where Ink is imported. It dynamically patches the platform primitives before rendering the application.

```js
#!/usr/bin/env node
process.env.PLATFORM = 'cli';

import { render } from 'ink';
import { createElement as h } from 'react';
import App from '../shared/App.js';

// Import the platform module to be patched
import * as platform from '../shared/platform/index.js';

// Dynamically import Ink and get its components
const { Box, Text, Newline } = await import('ink');

// Monkey-patch the platform exports for the CLI process
Object.assign(platform, { Box, Text, Newline });

// Render the app now that the primitives are correctly set
render(h(App));
```

---

## 5. Web Entry Point (`ui/web/index.js`)

The web entry point remains simple and unchanged.

```js
process.env.PLATFORM = 'web';

import { createRoot } from 'react-dom/client';
import { createElement as h } from 'react';
import App from '../shared/App.js';

createRoot(document.getElementById('root')).render(h(App));
```

---

## 6. Shared Components

Components can now safely import from `platform` and will receive the correct primitives based on the environment.

### Example: `ui/shared/components/Button.js`
```js
import { h, Box, Text, PLATFORM } from '../platform/index.js';

export default function Button({ children, onPress, primary }) {
  if (PLATFORM === 'cli') {
    return h(Box, {
      borderStyle: 'round',
      paddingX: 1,
      borderColor: primary ? 'blue' : 'gray',
    }, h(Text, {}, children));
  }

  return h('button', {
    onClick: onPress,
    style: {
      background: primary ? '#1e90ff' : '#333',
      color: 'white',
      padding: '8px 16px',
      border: 'none',
      borderRadius: 4,
    }
  }, children);
}
```

---

## 7. Development and Build

### Dev Scripts (`package.json`)
```json
{
  "scripts": {
    "dev:cli": "nodemon --watch ui --ext js --exec 'PLATFORM=cli node ui/cli/index.js'",
    "dev:web": "vite"
  }
}
```

### Vite Config (`ui/web/vite.config.js`)
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // The root is the web sub-directory
  root: 'ui/web',
  plugins: [
    react({
      // Use classic runtime to avoid automatic JSX imports
      jsxRuntime: 'classic'
    })
  ],
});
```

### Build CLI Binary
```bash
pkg ui/cli/index.js --out-path dist/ --targets node18-linux-x64
```