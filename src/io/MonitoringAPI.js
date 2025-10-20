import { EventEmitter } from 'events';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

export class MonitoringAPI {
    constructor(nar, options = {}) {
        this.nar = nar;
        this.port = options.port || 8080;
        this.host = options.host || 'localhost';
        this.server = null;
        this.wss = null;
        this.clients = new Set();
        this.eventEmitter = new EventEmitter();
        
        // Track metrics for broadcasting
        this.metrics = {
            cycleCount: 0,
            taskCount: 0,
            conceptCount: 0,
            startTime: Date.now()
        };
        
        this._setupEventListeners();
    }
    
    _setupEventListeners() {
        // Listen to NAR events and broadcast to WebSocket clients
        this.nar.on('cycle.completed', (cycleData) => {
            this.metrics.cycleCount++;
            this._broadcastEvent('cycle.completed', {
                cycle: this.metrics.cycleCount,
                data: cycleData,
                timestamp: Date.now()
            });
        });
        
        this.nar.on('task.input', (taskData) => {
            this.metrics.taskCount++;
            this._broadcastEvent('task.input', {
                ...taskData,
                timestamp: Date.now()
            });
        });
        
        this.nar.on('task.added', (taskData) => {
            this._broadcastEvent('task.added', {
                ...taskData,
                timestamp: Date.now()
            });
        });
        
        this.nar.on('system.started', (systemData) => {
            this._broadcastEvent('system.started', {
                ...systemData,
                timestamp: Date.now()
            });
        });
        
        this.nar.on('system.stopped', (systemData) => {
            this._broadcastEvent('system.stopped', {
                ...systemData,
                timestamp: Date.now()
            });
        });
        
        this.nar.on('system.reset', (systemData) => {
            this._broadcastEvent('system.reset', {
                ...systemData,
                timestamp: Date.now()
            });
        });
    }
    
    async start() {
        return new Promise((resolve, reject) => {
            this.server = createServer();
            this.wss = new WebSocketServer({ server: this.server });
            
            this.wss.on('connection', (ws, req) => {
                this.clients.add(ws);
                
                // Send initial state when client connects
                this._sendInitialState(ws);
                
                ws.on('close', () => {
                    this.clients.delete(ws);
                });
                
                ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.clients.delete(ws);
                });
            });
            
            this.server.listen(this.port, this.host, () => {
                console.log(`Monitoring API WebSocket server running on ws://${this.host}:${this.port}`);
                resolve();
            });
            
            this.server.on('error', (error) => {
                reject(error);
            });
        });
    }
    
    stop() {
        if (this.wss) {
            this.wss.close();
        }
        if (this.server) {
            this.server.close();
        }
        this.clients.clear();
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
        const message = {
            type: eventType,
            data,
            timestamp: Date.now()
        };
        
        this._sendToAllClients(message);
    }
    
    _sendToClient(client, message) {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending message to client:', error);
                this.clients.delete(client);
            }
        } else {
            this.clients.delete(client);
        }
    }
    
    _sendToAllClients(message) {
        for (const client of this.clients) {
            this._sendToClient(client, message);
        }
    }
    
    // Endpoint to get current system metrics
    getSystemMetrics() {
        return {
            ...this.metrics,
            systemStats: this.nar.getStats(),
            runtime: Date.now() - this.metrics.startTime,
            connectedClients: this.clients.size
        };
    }
    
    // Endpoint to get current concepts
    getConcepts() {
        const concepts = [];
        for (const concept of this.nar.memory.getAllConcepts()) {
            concepts.push({
                term: concept.term.name,
                taskCount: concept.getTasksByType('BELIEF').length,
                priority: concept.priority || 0,
                lastAccess: concept.lastAccess || 0
            });
        }
        return concepts;
    }
    
    // Endpoint to get recent tasks
    getRecentTasks(limit = 50) {
        // This would require the memory system to track recent tasks
        // For now, we'll return a sample of beliefs
        const allBeliefs = this.nar.getBeliefs();
        return allBeliefs.slice(-limit).map(task => ({
            term: task.term.name,
            truth: task.truth ? task.truth.toString() : null,
            priority: task.budget?.priority || 0,
            type: task.type
        }));
    }
}