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

    async start() {
        return new Promise((resolve, reject) => {
            this.server = new WebSocketServer({ 
                port: this.port, 
                host: this.host,
                path: this.path 
            });

            this.server.on('connection', (ws, request) => {
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

    async stop() {
        return new Promise((resolve) => {
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

    broadcastEvent(eventType, data, options = {}) {
        try {
            if (this.eventFilter && typeof this.eventFilter === 'function') {
                if (!this.eventFilter(eventType, data)) {
                    return;
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

    _sendToClient(client, message) {
        try {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(message));
            }
        } catch (error) {
            console.error('Error sending message to client:', error);
        }
    }

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

    _handleSubscribe(client, message) {
        this._sendToClient(client, {
            type: 'subscription_ack',
            subscribedTo: message.eventTypes || 'all',
            timestamp: Date.now()
        });
    }

    _handleUnsubscribe(client, message) {
        this._sendToClient(client, {
            type: 'unsubscription_ack',
            unsubscribedFrom: message.eventTypes || 'all',
            timestamp: Date.now()
        });
    }

    _generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

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

    getClients() {
        return Array.from(this.clients).map(client => ({
            id: client.clientId,
            readyState: client.readyState,
            remoteAddress: client._socket?.remoteAddress
        }));
    }

    listenToNAR(nar) {
        if (!nar || !nar.on) {
            throw new Error('NAR instance must have an on() method');
        }

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

    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }

    off(event, listener) {
        this.eventEmitter.off(event, listener);
    }
}

export { WebSocketMonitor };