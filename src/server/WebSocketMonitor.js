import { WebSocketServer } from 'ws';
import {EventEmitter} from 'events';

const DEFAULT_OPTIONS = Object.freeze({
    port: 8080,
    host: 'localhost',
    path: '/ws',
    maxConnections: 10
});

const NAR_EVENTS = Object.freeze([
    'task.input',
    'task.processed', 
    'cycle.start',
    'cycle.complete',
    'task.added',
    'belief.added',
    'question.answered',
    'system.started',
    'system.stopped',
    'system.reset',
    'system.loaded'
]);

/**
 * WebSocket server for real-time monitoring
 */
class WebSocketMonitor {
    constructor(options = {}) {
        this.port = options.port || DEFAULT_OPTIONS.port;
        this.host = options.host || DEFAULT_OPTIONS.host;
        this.path = options.path || DEFAULT_OPTIONS.path;
        this.maxConnections = options.maxConnections || DEFAULT_OPTIONS.maxConnections;
        this.eventFilter = options.eventFilter || null;
        this.clients = new Set();
        this.eventEmitter = new EventEmitter();
        this.server = null;
    }

    /**
     * Start the WebSocket server
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.server = new WebSocketServer({ 
                port: this.port, 
                host: this.host,
                path: this.path 
            });

            this.server.on('connection', (ws, request) => {
                // Check connection limit
                if (this.clients.size >= this.maxConnections) {
                    ws.close(1013, 'Server busy, too many connections');
                    return;
                }

                this.clients.add(ws);
                const clientId = this._generateClientId();
                ws.clientId = clientId;

                this._sendToClient(ws, {
                    type: 'connection',
                    data: { 
                        clientId,
                        timestamp: Date.now(),
                        message: 'Connected to SeNARS monitoring server'
                    }
                });

                ws.on('message', (data) => this._handleClientMessage(ws, data));
                ws.on('close', () => {
                    this.clients.delete(ws);
                    this.eventEmitter.emit('clientDisconnected', { clientId, timestamp: Date.now() });
                });
                
                this.eventEmitter.emit('clientConnected', { clientId, timestamp: Date.now() });
            });

            this.server.on('error', (error) => {
                console.error('WebSocket server error:', error);
                reject(error);
            });

            this.server.on('listening', () => {
                console.log(`WebSocket monitoring server started on ws://${this.host}:${this.port}${this.path}`);
                resolve();
            });
        });
    }

    /**
     * Stop the WebSocket server
     */
    async stop() {
        return new Promise((resolve) => {
            // Close all client connections
            for (const client of this.clients) {
                client.close(1001, 'Server shutting down');
            }
            
            this.clients.clear();

            if (this.server) {
                this.server.close(() => {
                    console.log('WebSocket monitoring server stopped');
                    resolve();
                });
            } else {
                console.log('WebSocket monitoring server stopped');
                resolve();
            }
        });
    }

    /**
     * Send an event to all connected clients
     * @param {string} eventType - Type of the event
     * @param {*} data - Event data
     */
    broadcastEvent(eventType, data, options = {}) {
        try {
            // Apply event filter if configured
            if (this.eventFilter && typeof this.eventFilter === 'function') {
                if (!this.eventFilter(eventType, data)) {
                    return; // Don't broadcast if filtered out
                }
            }

            const message = {
                type: 'event',
                eventType,
                data,
                timestamp: Date.now(),
                ...options
            };

            const jsonMessage = JSON.stringify(message);
            
            for (const client of this.clients) {
                if (client.readyState === client.OPEN) {
                    client.send(jsonMessage);
                }
            }
        } catch (error) {
            console.error('Error broadcasting event:', error);
        }
    }

    /**
     * Send a message to a specific client
     * @param {WebSocket} client - Target client
     * @param {Object} message - Message to send
     */
    _sendToClient(client, message) {
        try {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(message));
            }
        } catch (error) {
            console.error('Error sending message to client:', error);
        }
    }

    /**
     * Handle incoming messages from clients
     * @param {WebSocket} client - Client that sent the message
     * @param {Buffer} data - Raw message data
     */
    _handleClientMessage(client, data) {
        try {
            const message = JSON.parse(data.toString());
            
            switch (message.type) {
                case 'subscribe':
                    this._handleSubscribe(client, message);
                    break;
                case 'unsubscribe':
                    this._handleUnsubscribe(client, message);
                    break;
                case 'ping':
                    this._sendToClient(client, { type: 'pong', timestamp: Date.now() });
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling client message:', error);
            this._sendToClient(client, { 
                type: 'error', 
                message: 'Invalid message format',
                error: error.message 
            });
        }
    }

    /**
     * Handle subscription messages
     */
    _handleSubscribe(client, message) {
        // In a more complex implementation, we might track what events each client wants
        // For now, we just acknowledge the subscription
        this._sendToClient(client, {
            type: 'subscription_ack',
            subscribedTo: message.eventTypes || 'all',
            timestamp: Date.now()
        });
    }

    /**
     * Handle unsubscription messages
     */
    _handleUnsubscribe(client, message) {
        this._sendToClient(client, {
            type: 'unsubscription_ack',
            unsubscribedFrom: message.eventTypes || 'all',
            timestamp: Date.now()
        });
    }

    /**
     * Generate a unique client ID
     * @returns {string} Unique client identifier
     */
    _generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get server statistics
     */
    getStats() {
        return {
            port: this.port,
            host: this.host,
            connections: this.clients.size,
            maxConnections: this.maxConnections,
            uptime: this.server ? Date.now() - this.server._handle.fd : 0,
            path: this.path
        };
    }

    /**
     * Get connected client information
     */
    getClients() {
        return Array.from(this.clients).map(client => ({
            id: client.clientId,
            readyState: client.readyState,
            remoteAddress: client._socket?.remoteAddress
        }));
    }

    /**
     * Listen for specific events from the NAR system
     */
    listenToNAR(nar) {
        if (!nar || !nar.on) {
            throw new Error('NAR instance must have an on() method');
        }

        // Subscribe to common NAR events
        NAR_EVENTS.forEach(eventName => {
            nar.on(eventName, (data, metadata) => {
                this.broadcastEvent(eventName, {
                    data,
                    metadata: metadata || {},
                    timestamp: Date.now()
                });
            });
        });

        console.log('WebSocket monitor now listening to NAR events');
    }

    /**
     * Add event listener
     */
    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }

    /**
     * Remove event listener
     */
    off(event, listener) {
        this.eventEmitter.off(event, listener);
    }
}

export { WebSocketMonitor };