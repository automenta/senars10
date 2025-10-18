import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type, // 'info', 'success', 'warning', 'error'
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationList 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </NotificationContext.Provider>
  );
};

const NotificationList = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: '250px'
    }}>
      {notifications.map(notification => (
        <NotificationItem 
          key={notification.id} 
          notification={notification} 
          onRemove={onRemove} 
        />
      ))}
    </div>
  );
};

const NotificationItem = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const getNotificationStyle = (type) => {
    const baseStyle = {
      padding: '12px 16px',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'all 0.3s ease-in-out',
    };

    switch (notification.type) {
      case 'success':
        return { ...baseStyle, backgroundColor: '#d4edda', border: '1px solid #c3e6cb', color: '#155724' };
      case 'warning':
        return { ...baseStyle, backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', color: '#856404' };
      case 'error':
        return { ...baseStyle, backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24' };
      default: // info
        return { ...baseStyle, backgroundColor: '#d1ecf1', border: '1px solid #bee5eb', color: '#0c5460' };
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <div style={getNotificationStyle(notification.type)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>{getIcon(notification.type)}</span>
        <span>{notification.message}</span>
      </div>
      <button
        onClick={() => onRemove(notification.id)}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '0',
          color: 'inherit',
          alignSelf: 'flex-start'
        }}
      >
        ×
      </button>
    </div>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Hook to add notifications from command service
export const useCommandNotifications = (commandService) => {
  const { addNotification } = useNotification();

  // Enhance command service with notification capability
  const enhancedCommandService = {
    ...commandService,
    executeWithFeedback: async (command, payload = {}, successMessage = null, errorMessage = null) => {
      try {
        addNotification(`Executing command: ${command}...`, 'info', 3000);
        const result = await commandService.execute(command, payload);
        addNotification(successMessage || `Command ${command} executed successfully`, 'success');
        return result;
      } catch (error) {
        addNotification(errorMessage || `Command ${command} failed: ${error.message}`, 'error');
        throw error;
      }
    }
  };

  return enhancedCommandService;
};