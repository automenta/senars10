/**
 * Common UI patterns and components
 */

import React from 'react';

/**
 * Loading component with consistent styling
 */
export const LoadingSpinner = ({ message = 'Loading...', size = 'medium', className = '' }) => {
  const sizeStyles = {
    small: { width: '20px', height: '20px', borderWidth: '2px' },
    medium: { width: '32px', height: '32px', borderWidth: '3px' },
    large: { width: '48px', height: '48px', borderWidth: '4px' }
  };

  const currentSize = sizeStyles[size] || sizeStyles.medium;

  return (
    <div className={`loading-container ${className}`} style={{ textAlign: 'center', padding: '20px' }}>
      <div
        style={{
          width: currentSize.width,
          height: currentSize.height,
          border: `${currentSize.borderWidth} solid #f3f3f3`,
          borderTop: `${currentSize.borderWidth} solid #007bff`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 10px'
        }}
      />
      {message && <div style={{ fontSize: '14px', color: '#666' }}>{message}</div>}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

/**
 * Error display component with consistent styling
 */
export const ErrorDisplay = ({ error, onRetry = null, retryMessage = 'Retry' }) => {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      color: '#721c24',
      textAlign: 'center'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Error occurred</div>
      <div style={{ fontSize: '14px', marginBottom: '10px' }}>{error?.message || error || 'An unknown error occurred'}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '6px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          {retryMessage}
        </button>
      )}
    </div>
  );
};

/**
 * Empty state component for consistent UX
 */
export const EmptyState = ({ icon = '📋', title = 'No items', message, action = null }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '20px',
      textAlign: 'center',
      color: '#666'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>{title}</div>
      {message && <div style={{ fontSize: '14px', marginBottom: '15px' }}>{message}</div>}
      {action && <div>{action}</div>}
    </div>
  );
};