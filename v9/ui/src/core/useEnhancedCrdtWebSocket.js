import { useCallback } from 'react';
import useCrdtWebSocket from './crdtWebSocket';
import { useNotification } from './NotificationSystem';
import { CONNECTION_STATUS } from '../core/shared/ClientConstants.js';

export const useEnhancedCrdtWebSocket = (url) => {
  const { addNotification } = useNotification();
  const baseWebSocket = useCrdtWebSocket(url);

  const enhancedConnectionStatus = useCallback((status) => {
    addNotification(
      `Connection status: ${status}`,
      {
        [CONNECTION_STATUS.CONNECTED]: 'success',
        [CONNECTION_STATUS.DISCONNECTED]: 'error',
        [CONNECTION_STATUS.ERROR]: 'error'
      }[status] || 'info'
    );
  }, [addNotification]);

  const handleWebSocketError = useCallback((error) => {
    addNotification(`WebSocket error: ${error.message}`, 'error');
  }, [addNotification]);

  const enhancedSendMessage = useCallback((command, payload = {}) => {
    try {
      baseWebSocket.sendMessage(command, payload);
      ['add_task', 'update_task', 'delete_task'].includes(command) &&
        addNotification(`Command ${command} sent`, 'info', 2000);
    } catch (error) {
      handleWebSocketError(error);
    }
  }, [baseWebSocket, addNotification, handleWebSocketError]);

  return {
    ...baseWebSocket,
    enhancedSendMessage,
    handleWebSocketError,
    enhancedConnectionStatus
  };
};

export default useEnhancedCrdtWebSocket;