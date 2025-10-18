// Narsese syntax suggestions for autocomplete
export const NARSESE_SUGGESTIONS = new Set([
  '-->', '==>', '<=>', '&/', '&|', '&&', '||', '--', '~~',
  '<', '>', '(', ')', '{', '}', '[', ']', '.', '!', '?'
]);

export const THEME = {
  colors: {
    primary: '#007bff',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#2c3e50',
    white: '#ffffff',
    gray: {
      100: '#f8f9fa',
      200: '#e9ecef',
      300: '#dee2e6',
      400: '#ced4da',
      500: '#adb5bd',
      600: '#6c757d',
      700: '#495057',
      800: '#343a40',
      900: '#212529'
    }
  },
  spacing: { xs: '5px', sm: '8px', md: '10px', lg: '15px', xl: '20px' },
  borderRadius: '4px',
  fontSize: { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '24px' },
  fontWeight: { normal: 'normal', bold: 'bold' }
};

export const LAYOUT = {
  headerHeight: '30px',
  panelMinHeight: '200px',
  panelMaxHeight: '300px',
  borderWidth: '1px',
  scrollbarWidth: '8px'
};

export const PANEL_CONFIG = {
  topPanel: { id: 'topPanel', name: 'Control & Input' },
  conceptMapPanel: { id: 'conceptMapPanel', name: 'Concept Map' },
  bottomPanel: { id: 'bottomPanel', name: 'Log & Tasks' }
};