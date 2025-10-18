import { CLIENT_STATUS, DEFAULTS } from './constants.js';

/**
 * Client management utilities
 * Handles client connections, validation, and IP tracking
 */

export class ClientUtils {
  static generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getClientIP(request) {
    return request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           request.headers['x-real-ip'] ||
           request.connection?.remoteAddress ||
           request.socket?.remoteAddress ||
           request.connection?.socket?.remoteAddress ||
           'unknown';
  }

  static isValidClient(client) {
    return client?.ws?.readyState === 1;
  }

  static isConnectionAllowed(clients, clientIP, config) {
    const limits = {
      maxPerIP: config.maxConnectionsPerIP || DEFAULTS.MAX_CONNECTIONS_PER_IP,
      maxTotal: config.maxTotalConnections || DEFAULTS.MAX_TOTAL_CONNECTIONS
    };

    const ipCount = Array.from(clients.values()).filter(c => c.ip === clientIP).length;
    return ipCount < limits.maxPerIP && clients.size < limits.maxTotal;
  }

  static isConnectionRateAllowed(connectionRateTracker, clientIP, config) {
    const now = Date.now();
    const windowMs = DEFAULTS.CONNECTION_RATE_WINDOW;
    const maxPerWindow = config.maxConnectionRate || DEFAULTS.MAX_CONNECTION_RATE;

    const attempts = connectionRateTracker.get(clientIP) || [];
    const recentAttempts = attempts.filter(time => now - time < windowMs);

    if (recentAttempts.length >= maxPerWindow) return false;

    recentAttempts.push(now);
    connectionRateTracker.set(clientIP, recentAttempts);
    return true;
  }

  static createClientInfo(clientId, ws, request, clientIP) {
    return {
      id: clientId,
      type: 'unknown',
      connectedAt: new Date(),
      lastSeen: new Date(),
      ws: ws,
      ip: clientIP,
      userAgent: request.headers['user-agent'] || 'unknown',
      connectionAttempts: 1,
      status: CLIENT_STATUS.CONNECTED,
      connectionId: this.generateConnectionId()
    };
  }

  static updateClientInfo(client, updates) {
    return { ...client, ...updates, lastSeen: new Date() };
  }

  static getClientsByType(clients, clientType) {
    return Array.from(clients.values()).filter(client => client.type === clientType);
  }

  static getValidClients(clients) {
    return Array.from(clients.values()).filter(this.isValidClient);
  }

  static countByProperty(collection, property) {
    return Array.from(collection).reduce((counts, item) => (
      counts[item[property]] = (counts[item[property]] || 0) + 1, counts
    ), {});
  }
}

export default ClientUtils;