import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111111',
    background: '#FAFAFA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F1F1F1',
    textSecondary: '#6B6B6B',
    border: '#E5E5E5',
    accent: '#111111',
    success: '#168A5A',
    danger: '#C24141',
    warning: '#A16207',
    input: '#FFFFFF',
    chrome: 'rgba(250, 250, 250, 0.92)',
    accentSoft: '#F1F1F1',
    successSoft: '#EAF7F1',
    dangerSoft: '#FBECEC',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    text: '#F5F5F5',
    background: '#0B0B0B',
    backgroundElement: '#111111',
    backgroundSelected: '#1E1E1E',
    textSecondary: '#A3A3A3',
    border: '#262626',
    accent: '#F5F5F5',
    success: '#4ADE9C',
    danger: '#F87171',
    warning: '#FBBF24',
    input: '#0B0B0B',
    chrome: 'rgba(11, 11, 11, 0.92)',
    accentSoft: '#1E1E1E',
    successSoft: 'rgba(74, 222, 156, 0.12)',
    dangerSoft: 'rgba(248, 113, 113, 0.12)',
    shadow: 'rgba(0, 0, 0, 0.2)',
  },
} as const;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;


export const Fonts = {
  sans: 'Ubuntu',
  sansMedium: 'Ubuntu-Medium',
  sansBold: 'Ubuntu-Bold',
  serif: Platform.select({ ios: 'ui-serif', default: 'serif', web: 'var(--font-serif)' }),
  rounded: Platform.select({ ios: 'ui-rounded', default: 'Ubuntu', web: 'Ubuntu' }),
  mono: Platform.select({ ios: 'Menlo', default: 'monospace', web: 'var(--font-mono)' }),
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 680;
