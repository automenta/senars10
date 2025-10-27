#!/usr/bin/env node

/**
 * SeNARS WebSocket Server with CLI Integration
 * Combines the REPL interface with real-time WebSocket monitoring
 */

import { ReplInterface } from './io/ReplInterface.js';
import { WebSocketMonitor } from './server/WebSocketMonitor.js';
import { NAR } from './nar/NAR.js';

// Default configuration
const DEFAULT_CONFIG = Object.freeze({
    nar: {
        lm: { enabled: false },  // Disable LM for initial testing
        reasoningAboutReasoning: { enabled: true }
    },
    persistence: {
        defaultPath: './agent.json'
    },
    webSocket: {
        port: process.env.WS_PORT || 8080,
        host: process.env.WS_HOST || 'localhost',
        maxConnections: 20
    }
});

/**
 * Initialize and start the SeNARS system
 */
async function main() {
    console.log('Starting SeNARS with WebSocket monitoring...');
    
    // Create NAR instance
    const nar = new NAR(DEFAULT_CONFIG.nar);
    await nar.initialize();
    
    // Create and start WebSocket monitor
    const monitor = new WebSocketMonitor(DEFAULT_CONFIG.webSocket);
    await monitor.start();
    nar.connectToWebSocketMonitor(monitor);
    
    // Create REPL interface with NAR
    const repl = new ReplInterface(DEFAULT_CONFIG);
    repl.nar = nar; // Override with initialized instance
    
    // Setup shutdown handling
    setupGracefulShutdown(repl, monitor);
    
    // Start the REPL
    await repl.start();
}

/**
 * Setup graceful shutdown handling
 */
function setupGracefulShutdown(repl, monitor) {
    process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        
        try {
            const state = repl.nar.serialize();
            await repl.persistenceManager.saveToDefault(state);
            console.log('Current state saved to agent.json');
        } catch (saveError) {
            console.error('Error saving state on shutdown:', saveError.message);
        }
        
        await monitor.stop();
        process.exit(0);
    });
    
    // Handle any uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}

// Run the main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Failed to start SeNARS:', error);
        process.exit(1);
    });
}

// Export for library usage
export { main as startServer };
export * from './module.js';