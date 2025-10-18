#!/usr/bin/env node
/* global process */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;

async function startServer() {
  console.log('Starting SeNARS simple WebSocket server...');

  // Spawn the actual server as a subprocess from the project root
  const serverProcess = spawn('node', ['--no-warnings', 'core/simple-websocket-server.mjs', PORT.toString()], {
    stdio: 'inherit',
    cwd: join(__dirname, '..'), // Set working directory to project root
    env: { ...process.env }
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start simple WebSocket server:', err);
  });

  serverProcess.on('close', (code) => {
    console.log(`Simple WebSocket server exited with code ${code}`);
  });

  console.log(`Simple WebSocket server is running on port ${PORT}`);
  return serverProcess;
}

// Start the server when this file is run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  startServer();
}

// For compatibility with the React app
export default startServer;
