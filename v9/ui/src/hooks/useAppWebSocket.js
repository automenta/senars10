import { useMemo } from 'react';
import useWebSocket from '@/core/useWebSocket';
import { CONNECTION_DEFAULTS } from '@core/shared/ClientConstants.js';

export const useAppWebSocket = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const serverPort = urlParams.get('serverPort') || CONNECTION_DEFAULTS.defaultPort;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.host.split(':')[0] || 'localhost';
  const wsUrl = `${wsProtocol}//${wsHost}:${serverPort}?protocol=simple`;

  return useWebSocket(wsUrl);
};
