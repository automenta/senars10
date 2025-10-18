# SeNARS UI

This is the React-based web UI for the SeNARS system, built with Vite.

## Features

- Tabbed interface for managing multiple connections
- Reasoner control panel with start/stop/reset functionality
- Real-time log display
- Task tree visualization
- Concept map visualization
- Input field for sending commands
- WebSocket connection management

## Development

To start both the backend server and the React development server:

```bash
npm run dev
```

This will:
- Start the integrated WebSocket server on port 8080
- Start the React development server on port 3000
- Automatically open the UI in your browser

## Building for Production

To build the UI for production:

```bash
npm run build
```

This creates a `dist` directory with the production build.

## Running the Preview

To preview the production build locally:

```bash
npm run preview
```

## Scripts

- `npm run dev` - Start development servers (both frontend and backend)
- `npm run client` - Start only the React development server
- `npm run server` - Start only the integrated WebSocket server
- `npm run build` - Create a production build
- `npm run preview` - Preview the production build
- `npm run lint` - Lint the code

## Architecture

The UI uses:
- React with hooks for state management
- WebSocket connections for real-time communication
- Modular component architecture
- Custom WebSocket hook for connection management