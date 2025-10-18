import { WebSocketUtils, DEFAULTS } from './WebSocketUtils.js';
import ConfigUtils from './configUtils.js';

/**
 * Centralized configuration management for all server components
 * Consolidates configuration patterns and provides consistent access
 * Enhanced with validation and sanitization
 */
class ServerConfig {
  constructor() {
    this.config = { ...DEFAULTS };
    this.serverConfig = {};
    this.websocketConfig = {};
    this.connectionLimits = {};
    this.streamSettings = {};
    this.isInitialized = false;
  }

  initialize(baseConfig = {}) {
    // Validate and sanitize the base configuration
    const validation = ConfigUtils.validateConfig(baseConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const sanitizedConfig = ConfigUtils.sanitizeConfig(baseConfig);
    this.config = WebSocketUtils.mergeConfig(this.config, sanitizedConfig);

    // Extract specific config sections using ConfigUtils
    this.serverConfig = {
      port: ConfigUtils.getServerPort(this),
      host: ConfigUtils.getServerHost(this),
      enabled: this.config.enabled ?? DEFAULTS.ENABLED
    };

    this.websocketConfig = {
      heartbeatInterval: ConfigUtils.getHeartbeatInterval(this),
      maxConnectionsPerIP: this.config.maxConnectionsPerIP ?? DEFAULTS.MAX_CONNECTIONS_PER_IP,
      maxTotalConnections: this.config.maxTotalConnections ?? DEFAULTS.MAX_TOTAL_CONNECTIONS,
      maxConnectionRate: this.config.maxConnectionRate ?? DEFAULTS.MAX_CONNECTION_RATE
    };

    this.connectionLimits = ConfigUtils.getConnectionLimits(this);
    this.streamSettings = ConfigUtils.getStreamSettings(this);

    this.isInitialized = true;
  }

  get(key, defaultValue = null) {
    return WebSocketUtils.getConfigValue(this.config, key, defaultValue);
  }

  getServerConfig() {
    return { ...this.serverConfig };
  }

  getWebSocketConfig() {
    return { ...this.websocketConfig };
  }

  getConnectionLimits() {
    return { ...this.connectionLimits };
  }

  getStreamSettings() {
    return { ...this.streamSettings };
  }

  isFeatureEnabled(feature) {
    return this.config.features?.[feature] ?? false;
  }

  updateConfig(updates) {
    this.config = WebSocketUtils.mergeConfig(this.config, updates);
    this.initialize(this.config); // Reinitialize derived configs
  }
}

export default ServerConfig;