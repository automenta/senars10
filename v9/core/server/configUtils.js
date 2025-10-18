import { DEFAULTS } from './constants.js';

/**
 * Configuration management utilities
 * Centralized configuration handling with fallbacks and validation
 */

export class ConfigUtils {
  static getConfigValue(config, key, defaultValue) {
    return config?.[key] ?? defaultValue;
  }

  static mergeConfig(baseConfig, overrides) {
    return { ...baseConfig, ...overrides };
  }

  static getServerPort(configManager) {
    return configManager?.getServerConfig().port ?? DEFAULTS.PORT;
  }

  static getServerHost(configManager) {
    return configManager?.getServerConfig().host ?? DEFAULTS.HOST;
  }

  static getHeartbeatInterval(configManager) {
    return configManager?.getWebSocketConfig().heartbeatInterval ?? DEFAULTS.HEARTBEAT_INTERVAL;
  }

  static getConnectionLimits(configManager) {
    return configManager?.getConnectionLimits() ?? {
      maxPerIP: DEFAULTS.MAX_CONNECTIONS_PER_IP,
      maxTotal: DEFAULTS.MAX_TOTAL_CONNECTIONS
    };
  }

  static getStreamSettings(configManager) {
    return configManager?.getStreamSettings() ?? {
      bufferSize: DEFAULTS.STREAM_BUFFER_SIZE,
      taskBufferSize: DEFAULTS.TASK_STREAM_BUFFER_SIZE,
      historyLimit: DEFAULTS.TASK_HISTORY_LIMIT,
      retentionTime: DEFAULTS.RETENTION_TIME
    };
  }

  static isFeatureEnabled(configManager, feature) {
    return configManager?.isFeatureEnabled(feature) ?? false;
  }

  static validateConfig(config) {
    const errors = [];

    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push('Port must be between 1 and 65535');
    }

    if (config.heartbeatInterval && config.heartbeatInterval < 1000) {
      errors.push('Heartbeat interval must be at least 1000ms');
    }

    if (config.maxConnectionsPerIP && config.maxConnectionsPerIP < 1) {
      errors.push('Max connections per IP must be at least 1');
    }

    if (config.maxTotalConnections && config.maxTotalConnections < 1) {
      errors.push('Max total connections must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeConfig(config) {
    const sanitized = { ...config };

    // Ensure numeric values are within reasonable bounds
    if (sanitized.port) sanitized.port = Math.max(1, Math.min(65535, sanitized.port));
    if (sanitized.heartbeatInterval) sanitized.heartbeatInterval = Math.max(1000, sanitized.heartbeatInterval);
    if (sanitized.maxConnectionsPerIP) sanitized.maxConnectionsPerIP = Math.max(1, sanitized.maxConnectionsPerIP);
    if (sanitized.maxTotalConnections) sanitized.maxTotalConnections = Math.max(1, sanitized.maxTotalConnections);

    return sanitized;
  }
}

export default ConfigUtils;