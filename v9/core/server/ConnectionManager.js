import { WebSocketUtils, DEFAULTS, CLIENT_STATUS, MESSAGE_TYPES } from './WebSocketUtils.js';
import ErrorHandler from './errorHandler.js';


class ConnectionManager {
  constructor(webSocketServer) {
    this.wss = webSocketServer;
    this.heartbeatInterval = null;
    this.connectionTracker = new Map();
    this.connectionRateTracker = new Map();
    this.connectionLimits = {
      maxPerIP: DEFAULTS.MAX_CONNECTIONS_PER_IP,
      maxTotal: DEFAULTS.MAX_TOTAL_CONNECTIONS
    };
  }

  initialize(config = {}) {
    this.connectionLimits = {
      maxPerIP: WebSocketUtils.getConfigValue(config, 'maxConnectionsPerIP', DEFAULTS.MAX_CONNECTIONS_PER_IP),
      maxTotal: WebSocketUtils.getConfigValue(config, 'maxTotalConnections', DEFAULTS.MAX_TOTAL_CONNECTIONS)
    };
  }

  handleConnection(ws, request) {
    const clientIP = WebSocketUtils.getClientIP(request);

    if (!this.isConnectionAllowed(clientIP)) {
      WebSocketUtils.warn(`Connection refused for IP ${clientIP} - too many connections`);
      ws.close(1008, 'Too many connections from your IP');
      return null;
    }

    if (!this.isConnectionRateAllowed(clientIP)) {
      WebSocketUtils.warn(`Connection rate limited for IP ${clientIP}`);
      ws.close(1013, 'Too many connection attempts');
      return null;
    }

    const clientId = WebSocketUtils.generateClientId();
    const clientInfo = this.createClientInfo(clientId, ws, request, clientIP);

    this.wss.clients.set(clientId, clientInfo);
    this.trackConnection(clientIP);

    this.setupClientHandlers(clientId, ws);

    WebSocketUtils.debug(`Client connected: ${clientId} from ${clientInfo.ip}`);

    return clientId;
  }

  createClientInfo(clientId, ws, request, clientIP) {
    return WebSocketUtils.createClientInfo(clientId, ws, request, clientIP);
  }

  setupClientHandlers(clientId, ws) {
    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
    ws.on('error', (error) => this.handleError(clientId, error));
  }

  handleMessage(clientId, data) {
    const client = this.wss.clients.get(clientId);
    if (!client) return;

    client.lastSeen = new Date();

    try {
      const message = WebSocketUtils.validateMessage(data);
      this.wss.messageHandler.handle(clientId, message);
    } catch (error) {
      ErrorHandler.handleError('parsing message', error, clientId);
    }
  }

  handleDisconnection(clientId, code, reason) {
    WebSocketUtils.debug(`Client ${clientId} disconnected (code: ${code}, reason: ${reason?.toString() || 'none'})`);
    this.wss.clients.delete(clientId);
  }

  handleError(clientId, error) {
    ErrorHandler.handleError('WebSocket', error, clientId);

    const client = this.wss.clients.get(clientId);
    client && (client.status = CLIENT_STATUS.ERROR, client.error = error.message);
  }

  isConnectionAllowed(clientIP) {
    const ipCount = Array.from(this.wss.clients.values()).filter(c => c.ip === clientIP).length;
    return ipCount < this.connectionLimits.maxPerIP && this.wss.clients.size < this.connectionLimits.maxTotal;
  }

  isConnectionRateAllowed(clientIP) {
    const now = Date.now();
    const windowMs = DEFAULTS.CONNECTION_RATE_WINDOW;
    const maxPerWindow = WebSocketUtils.getConfigValue(this.wss.config, 'maxConnectionRate', DEFAULTS.MAX_CONNECTION_RATE);

    const attempts = this.connectionRateTracker.get(clientIP) || [];
    const recentAttempts = attempts.filter(time => now - time < windowMs);

    if (recentAttempts.length >= maxPerWindow) return false;

    recentAttempts.push(now);
    this.connectionRateTracker.set(clientIP, recentAttempts);
    return true;
  }

  trackConnection(clientIP) {
    if (!this.connectionTracker.has(clientIP)) {
      this.connectionTracker.set(clientIP, 0);
    }

    const count = this.connectionTracker.get(clientIP);
    this.connectionTracker.set(clientIP, count + 1);
  }

  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    const interval = this.wss.config?.heartbeatInterval ?? DEFAULTS.HEARTBEAT_INTERVAL;
    this.heartbeatInterval = setInterval(() => {
      this.processHeartbeat();
    }, interval);
  }

  processHeartbeat() {
    const now = new Date();
    const timeout = (WebSocketUtils.getConfigValue(this.wss.config, 'heartbeatInterval', DEFAULTS.HEARTBEAT_INTERVAL)) * DEFAULTS.CLIENT_TIMEOUT_MULTIPLIER;

    for (const [clientId, client] of this.wss.clients) {
      try {
        if (now - client.lastSeen > timeout) {
          WebSocketUtils.debug(`Client ${clientId} timed out`);
          client.ws.close(1000, 'Heartbeat timeout');
          this.handleDisconnection(clientId);
        } else if (WebSocketUtils.isValidClient(client)) {
          client.ws.send(JSON.stringify(WebSocketUtils.createMessage(MESSAGE_TYPES.HEARTBEAT)));
        }
      } catch (error) {
        ErrorHandler.handleError('heartbeat processing', error, clientId);
        this.handleDisconnection(clientId);
      }
    }
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  sendWelcomeMessage(clientId) {
    const client = this.wss.clients.get(clientId);
    if (!client) return;

    const welcomeMessage = WebSocketUtils.createMessage(MESSAGE_TYPES.WELCOME, { clientId, serverInfo: { version: '2.0.0', features: ['nars_protocol', 'realtime_streaming', 'task_sync'] }, connectionId: client.connectionId });
    this.wss.sendToClient(clientId, welcomeMessage);
  }

  sendCurrentState(clientId) {
    if (!this.wss.core) return;

    setImmediate(() => {
      try {
        const state = WebSocketUtils.extractSystemState(this.wss.core);
        WebSocketUtils.addSystemStatsToState(this.wss.core, state);
        const stateMessage = WebSocketUtils.createMessage(MESSAGE_TYPES.COMPLETE_STATE, state);
        this.wss.sendToClient(clientId, stateMessage);
      } catch (error) {
        ErrorHandler.handleError('sending current state', error, clientId);
      }
    });
  }

  getStats() {
    const clients = Array.from(this.wss.clients.values());
    const clientTypes = WebSocketUtils.countByProperty(clients, 'type');
    const clientIPs = WebSocketUtils.countByProperty(clients, 'ip');

    return {
      clientCount: this.wss.clients.size,
      clientsByType: clientTypes,
      clientsByIP: clientIPs,
      connectionLimits: this.connectionLimits,
      connectionStats: {
        trackedIPs: this.connectionTracker.size,
        totalConnectionAttempts: Array.from(this.connectionTracker.values()).reduce((sum, count) => sum + count, 0)
      }
    };
  }

  cleanup() {
    this.stopHeartbeat();
    this.connectionTracker.clear();
    this.connectionRateTracker.clear();
  }
}

export default ConnectionManager;