import { THEME } from '../constants';

// Color mapping utilities - consolidated for DRY principle
const createColorMap = (mappings, fallback = THEME.colors.gray[600]) => (key) =>
  mappings[key] || fallback;

export const getPriorityColor = (priority) => {
  const priorityMap = {
    high: THEME.colors.danger,
    medium: THEME.colors.warning,
    low: THEME.colors.success
  };
  return priority > 0.8 ? priorityMap.high :
         priority > 0.5 ? priorityMap.medium :
         priority > 0.2 ? priorityMap.low :
         THEME.colors.gray[600];
};

export const getStatusColor = createColorMap({
  connected: THEME.colors.success,
  connecting: THEME.colors.warning,
  disconnected: THEME.colors.danger,
  running: THEME.colors.success,
  paused: THEME.colors.warning,
  stopped: THEME.colors.danger,
  error: THEME.colors.danger
});

export const getLogLevelColor = createColorMap({
  error: THEME.colors.danger,
  warn: THEME.colors.warning,
  info: THEME.colors.info,
  debug: THEME.colors.gray[600]
}, THEME.colors.success);

// Icon utilities - consolidated icon mapping
const createIconMap = (iconMappings, defaultIcon) => (key, fallback = defaultIcon) => {
  if (!key) return fallback;
  return iconMappings[key.toLowerCase()] || fallback;
};

const ITEM_ICONS = {
  input: '📥',
  derived: '✨',
  goal: '🎯',
  question: '❓',
  operation: '⚙️',
  inference: '💭'
};

const LOG_ICONS = {
  error: '❌',
  warning: '⚠️',
  warn: '⚠️',
  info: 'ℹ️',
  task: '📋',
  concept: '🧠',
  cycle: '🔄',
  goal: '🎯',
  question: '❓',
  inference: '💭',
  operation: '⚙️'
};

export const getItemIcon = createIconMap(ITEM_ICONS, '📋');

export const getLogIcon = (message) => {
  if (!message || typeof message !== 'string') return '🔹';
  const messageLower = message.toLowerCase();
  return LOG_ICONS[Object.keys(LOG_ICONS).find(key => messageLower.includes(key))] || '🔹';
};

// Text utilities - consolidated mapping and formatting
const createTextMap = (textMappings, fallback = 'Unknown') => (key) =>
  textMappings[key] || fallback;

export const getConnectionStatusText = createTextMap({
  connected: 'Connected',
  connecting: 'Connecting...',
  reconnecting: 'Reconnecting...',
  disconnected: 'Disconnected'
});

export const formatLogData = (log) => {
  if (!log) return '';
  const isYjsObject = typeof log.get === 'function';
  return isYjsObject ? log.get('data') : (log.data || log.message || JSON.stringify(log));
};

export const formatLogLevel = (log) => {
  if (!log) return 'info';
  const isYjsObject = typeof log.get === 'function';
  return isYjsObject ? log.get('level') : (log.level || 'info');
};

// Style utilities - consolidated style factories for DRY principle
const createBaseStyle = (defaults, overrides = {}) => ({ ...defaults, ...overrides });

const COMMON_STYLES = {
  panel: {
    border: `1px solid ${THEME.colors.gray[300]}`,
    borderRadius: THEME.borderRadius,
    backgroundColor: THEME.colors.white,
    marginBottom: THEME.spacing.md,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  header: {
    padding: `${THEME.spacing.sm} ${THEME.spacing.md}`,
    backgroundColor: THEME.colors.gray[100],
    borderBottom: `1px solid ${THEME.colors.gray[300]}`,
    fontWeight: THEME.fontWeight.bold,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.dark
  },
  content: {
    padding: THEME.spacing.md,
    flex: 1,
    overflowY: 'auto'
  }
};

export const createPanelStyle = (overrides) => createBaseStyle(COMMON_STYLES.panel, overrides);
export const createHeaderStyle = (overrides) => createBaseStyle(COMMON_STYLES.header, overrides);
export const createContentStyle = (overrides) => createBaseStyle(COMMON_STYLES.content, overrides);

export const createBadgeStyle = (color, overrides) => createBaseStyle({
  padding: `2px ${THEME.spacing.sm}`,
  backgroundColor: `${color}20`,
  color: color,
  borderRadius: '12px',
  fontSize: THEME.fontSize.xs,
  fontWeight: THEME.fontWeight.bold,
  display: 'inline-block'
}, overrides);

export const createButtonStyle = (variant = 'primary', overrides) => {
  const baseStyle = {
    padding: `${THEME.spacing.xs} ${THEME.spacing.md}`,
    border: 'none',
    borderRadius: THEME.borderRadius,
    cursor: 'pointer',
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    transition: 'all 0.2s ease'
  };

  const variantStyles = {
    primary: { backgroundColor: THEME.colors.primary, color: THEME.colors.white },
    success: { backgroundColor: THEME.colors.success, color: THEME.colors.white },
    danger: { backgroundColor: THEME.colors.danger, color: THEME.colors.white },
    warning: { backgroundColor: THEME.colors.warning, color: THEME.colors.dark },
    info: { backgroundColor: THEME.colors.info, color: THEME.colors.white },
    secondary: { backgroundColor: THEME.colors.gray[400], color: THEME.colors.dark }
  };

  return createBaseStyle(baseStyle, { ...variantStyles[variant], ...overrides });
};

export const createLabelStyle = (overrides) => createBaseStyle({
  display: 'block',
  marginBottom: THEME.spacing.xs,
  fontWeight: THEME.fontWeight.bold,
  fontSize: THEME.fontSize.xs
}, overrides);

export const createInputStyle = (overrides) => createBaseStyle({
  padding: THEME.spacing.xs,
  border: `1px solid ${THEME.colors.gray[400]}`,
  borderRadius: THEME.borderRadius
}, overrides);

export const createStatBoxStyle = (overrides) => createBaseStyle({
  padding: THEME.spacing.sm,
  backgroundColor: THEME.colors.gray[200],
  borderRadius: THEME.borderRadius,
  textAlign: 'center'
}, overrides);

// Layout utilities
export const createGridLayout = (columns = 'repeat(auto-fit, minmax(200px, 1fr))', gap = THEME.spacing.md) => ({
  display: 'grid',
  gridTemplateColumns: columns,
  gap: gap
});

export const createFlexLayout = (direction = 'row', justify = 'flex-start', align = 'stretch', overrides = {}) => ({
  display: 'flex',
  flexDirection: direction,
  justifyContent: justify,
  alignItems: align,
  ...overrides
});

// Animation utilities
export const fadeIn = {
  animation: 'fadeIn 0.3s ease-in-out'
};

export const slideIn = {
  animation: 'slideIn 0.3s ease-in-out'
};

// Responsive utilities
export const responsive = {
  mobile: '@media (max-width: 768px)',
  tablet: '@media (min-width: 769px) and (max-width: 1024px)',
  desktop: '@media (min-width: 1025px)'
};