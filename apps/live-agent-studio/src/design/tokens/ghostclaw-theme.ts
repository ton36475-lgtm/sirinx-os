/**
 * GHOSTCLAW_LOOP_ENGINEERING Theme Tokens
 * Figma Design System v1.1
 */

export const ghostclawTokens = {
  colors: {
    primary: {
      50: '#E6F7FF',
      100: '#BAE0FF',
      200: '#91CAFF',
      300: '#69B1FF',
      400: '#4096FF',
      500: '#1677FF',  // Main brand
      600: '#0958D9',
      700: '#003D99',
      800: '#002266',
      900: '#001540'
    },
    agent: {
      planner: '#1677FF',   // Blue
      frontend: '#556FFB', // Purple
      backend: '#1677FF',
      browser: '#10B981',  // Green
      devops: '#F59F00',   // Orange
      reviewer: '#868E96'  // Gray
    },
    status: {
      draft: '#F59F00',
      active: '#10B981',
      blocked: '#FA5252',
      completed: '#1677FF'
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32
    }
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16
  }
};

export type GhostClawTokens = typeof ghostclawTokens;