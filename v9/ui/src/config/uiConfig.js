// UI Configuration for flexible component management
const UI_CONFIG = {
  // Control panel configuration
  controlPanel: {
    showStartButton: true,
    showStopButton: true,
    showStepButton: true,  // Critical for the Step functionality
    showResetButton: true,
    showThrottleControl: true,
    showStats: true,
    showChart: true,
    showInputField: true,
    defaultThrottle: 100,
    maxHistorySize: 50
  },
  
  // Component layout configuration
  layout: {
    defaultOrientation: 'horizontal', // or 'vertical'
    panelSizes: {
      controlPanel: { height: 'auto', width: '100%' },
      conceptMap: { height: '300px', width: '100%' },
      bottomPanels: { height: '400px', width: '100%' }
    }
  },
  
  // Theme and styling
  theme: {
    colors: {
      primary: '#007bff',
      success: '#28a745',
      danger: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107',
      light: '#f8f9fa',
      dark: '#343a40'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    }
  },
  
  // Command settings
  commands: {
    defaultPriority: 0.5,
    timeout: 5000, // ms
    retryAttempts: 3
  }
};

export default UI_CONFIG;