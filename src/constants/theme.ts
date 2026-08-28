/**
 * Design tokens for the app. Colors are defined for light and dark mode and
 * resolved through `useTheme()`.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#60646C',
    background: '#F2F2F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E0E1E6',
    separator: 'rgba(60,60,67,0.18)',
    tint: '#0A84FF',
    danger: '#E5484D',
    warning: '#F76B15',
    success: '#30A46C',
    neutral: '#8E8E93',
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#B0B4BA',
    background: '#000000',
    backgroundElement: '#1C1C1E',
    backgroundSelected: '#2E3135',
    separator: 'rgba(84,84,88,0.6)',
    tint: '#0A84FF',
    danger: '#FF6369',
    warning: '#FF8B3D',
    success: '#3DD68C',
    neutral: '#8E8E93',
  },
} as const;

export type ThemeColors = { [K in keyof (typeof Colors)['light']]: string };
export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { card: 14, control: 10, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
