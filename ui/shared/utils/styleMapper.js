// ui/shared/utils/styleMapper.js
import theme from '../styles/theme.js';

export function mapStyle(style, platform) {
  if (!style) return {};

  if (platform === 'cli') {
    // Blessed: bg, fg, bold, etc.
    return {
      bg: style.bg || theme.palette.bg,
      fg: style.fg || theme.palette.fg,
      bold: style.bold,
      // ... other blessed attrs
    };
  }

  // Web: CSS-in-JS
  return {
    backgroundColor: style.bg || theme.palette.bg,
    color: style.fg || theme.palette.fg,
    fontWeight: style.bold ? 'bold' : 'normal',
    padding: style.p ? `${style.p}px` : undefined,
    margin: style.m ? `${style.m}px` : undefined,
  };
}