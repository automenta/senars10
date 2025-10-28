import {EventEmitter} from 'events';
import {createServer} from 'http';
import {WebSocketServer} from 'ws';

const DEFAULT_OPTIONS = {port: 8080, host: 'localhost'};
const EVENT_HANDLERS = {
    'cycle.completed': (api, data) => {
        api.metrics.cycleCount++;
        api._broadcastEvent('cycle.completed', {cycle: api.metrics.cycleCount, data, timestamp: Date.now()});
    },
    'task.input': (api, data) => {
        api.metrics.taskCount++;
        api._broadcastEvent('task.input', {...data, timestamp: Date.now()});
    },
    'task.added': (api, data) => api._broadcastEvent('task.added', {...data, timestamp: Date.now()}),
    'system.started': (api, data) => api._broadcastEvent('system.started', {...data, timestamp: Date.now()}),
    'system.stopped': (api, data) => api._broadcastEvent('system.stopped', {...data, timestamp: Date.now()}),
    'system.reset': (api, data) => api._broadcastEvent('system.reset', {...data, timestamp: Date.now()})
};

export class MonitoringAPI {
    constructor(nar, options = {}) {
        this.nar = nar;
        this.config = {...DEFAULT_OPTIONS, ...options};
        this.server = null;
        this.wss = null;
        this.clients = new Set();
        this.eventEmitter = new EventEmitter();

        this.metrics = {
            cycleCount: 0,
            taskCount: 0,
            conceptCount: 0,
            startTime: Date.now()
        };

        this._setupEventListeners();
    }

    _setupEventListeners() {
        Object.entries(EVENT_HANDLERS).forEach(([event, handler]) => {
            this.nar.on(event, (data) => handler(this, data));
        });
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = createServer();
            this.wss = new WebSocketServer({server: this.server});

            this.wss.on('connection', (ws) => this._handleConnection(ws));
            this.server.listen(this.config.port, this.config.host, () => {
                console.log(`Monitoring API WebSocket server running on ws://${this.config.host}:${this.config.port}`);
                resolve();
            });
            this.server.on('error', reject);
        });
    }

    stop() {
        this.wss?.close();
        this.server?.close();
        this.clients.clear();
    }

    _handleConnection(ws) {
        this.clients.add(ws);
        this._sendInitialState(ws);

        ws.on('close', () => this.clients.delete(ws));
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.clients.delete(ws);
        });
    }

    _sendInitialState(ws) {
        const initialState = {
            type: 'initial_state',
            data: {
                metrics: this.metrics,
                systemStats: this.nar.getStats(),
                memoryStats: this.nar.memory.getDetailedStats(),
                isRunning: this.nar.isRunning,
                cycleCount: this.nar.cycleCount
            },
            timestamp: Date.now()
        };
        this._sendToClient(ws, initialState);
    }

    _broadcastEvent(eventType, data) {
        const message = {type: eventType, data, timestamp: Date.now()};
        this._sendToAllClients(message);
    }

    _sendToClient(client, message) {
        if (client.readyState !== WebSocket.OPEN) {
            this.clients.delete(client);
            return;
        }

        try {
            client.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error sending message to client:', error);
            this.clients.delete(client);
        }
    }

    _sendToAllClients(message) {
        this.clients.forEach(client => this._sendToClient(client, message));
    }

    getSystemMetrics() {
        return {
            ...this.metrics,
            systemStats: this.nar.getStats(),
            runtime: Date.now() - this.metrics.startTime,
            connectedClients: this.clients.size
        };
    }

    getConcepts() {
        return Array.from(this.nar.memory.getAllConcepts()).map(concept => ({
            term: concept.term.name,
            taskCount: concept.getTasksByType('BELIEF').length,
            priority: concept.priority || 0,
            lastAccess: concept.lastAccess || 0
        }));
    }

    getRecentTasks(limit = 50) {
        return this.nar.getBeliefs().slice(-limit).map(task => ({
            term: task.term.name,
            truth: task.truth?.toString() || null,
            priority: task.budget?.priority || 0,
            type: task.type
        }));
    }
}