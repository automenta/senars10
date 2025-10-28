#!/usr/bin/env node

import { ReplInterface } from './io/ReplInterface.js';
import { WebSocketMonitor } from './server/WebSocketMonitor.js';
import { NAR } from './nar/NAR.js';

const DEFAULT_CONFIG = Object.freeze({
    nar: {
        lm: { enabled: false },
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

async function main() {
    console.log('Starting SeNARS with WebSocket monitoring...');

    const nar = new NAR(DEFAULT_CONFIG.nar);
    await nar.initialize();

    const monitor = new WebSocketMonitor(DEFAULT_CONFIG.webSocket);
    await monitor.start();
    nar.connectToWebSocketMonitor(monitor);

    const repl = new ReplInterface(DEFAULT_CONFIG);
    repl.nar = nar;

    setupGracefulShutdown(repl, monitor);
    await repl.start();
}

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

    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}

import.meta.url === `file://${process.argv[1]}` && main().catch(error => {
    console.error('Failed to start SeNARS:', error);
    process.exit(1);
});

export { main as startServer };
export * from './module.js';