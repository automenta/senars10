# SeNARS UI

The SeNARS UI module provides a comprehensive graphical interface for the SeNARS cognitive architecture system.

## Features

- **Connection Tabs**: Manage multiple agent connections via WebSocket protocol
- **Reasoner Control**: Start/stop, CPU throttle, and statistics/metrics
- **Input Field**: Text/narsese with history and REPL-like features
- **Animated Log**: Colorized activity log with fixed buffer size
- **Active Tasks**: Real-time task tree with prioritization
- **Concept Map**: Real-time animated force-directed graph visualization
- **No-Connection Mode**: Integrated server runs as subprocess

## Prerequisites

NodeGUI requires additional system dependencies:

### Linux
```bash
# Install Qt5 development libraries
sudo apt-get install qt5-default qt5-qmake libqt5websockets5-dev
```

### Node.js
This module is designed for Node.js v18 or v20 LTS. Node.js v24 may have compatibility issues with NodeGUI.

## Installation

1. Install system dependencies (see above)
2. Install project dependencies:
```bash
npm install
```

## Running the UI

```bash
npm run ui
```

## Troubleshooting

If you encounter the error:
```
Error: ...nodegui_core.node: undefined symbol: _ZN4qode9qode_argvE
```

This indicates a compatibility issue between NodeGUI's native modules and your system. Try:

1. Use Node.js 18 or 20 LTS instead of 24.9.0
2. Rebuild NodeGUI: `npm rebuild @nodegui/nodegui`
3. If still failing, you may need to compile from source

## Architecture

The UI follows a component-based architecture as outlined in `AGENTS.md`:
- All components are in the `ui/` directory
- Uses NodeGUI for the native interface
- WebSocket connections for communication with core
- Integrated server for standalone operation

## Module Structure

- `ui/` - Main UI module
  - `components/` - Individual UI components
  - `utils/` - Utility functions and classes
  - `index.mjs` - Main application window
  - `main.mjs` - Entry point
- `core/server.mjs` - Integrated server implementation
- `core/WebSocketManager.mjs` - WebSocket communication