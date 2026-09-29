import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.05,
  },
  smallBold: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.05,
  },
  default: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.08,
  },
  title: {
    fontFamily: Fonts.sansBold,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -0.9,
  },
  subtitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.35,
  },
  link: {
    fontFamily: Fonts.sansMedium,
    lineHeight: 22,
    fontSize: 15,
  },
  linkPrimary: {
    fontFamily: Fonts.sansBold,
    lineHeight: 22,
    fontSize: 15,
    color: '#E95420',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
});
