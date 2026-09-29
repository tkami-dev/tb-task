import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M47 24.55c0-1.57-.14-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.5-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.77 24c0-1.6.28-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
    </Svg>
  );
}

export function GoogleTasksMark({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M2.6 5.6 4.7 7.7 8.2 4.2"
        fill="none"
        stroke="#34A853"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="11" y="4.6" width="11" height="2.1" rx="1.05" fill="#4285F4" />
      <Path
        d="M2.6 13.4 4.7 15.5 8.2 12"
        fill="none"
        stroke="#4285F4"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="11" y="12.4" width="11" height="2.1" rx="1.05" fill="#EA4335" />
    </Svg>
  );
}

export function GoogleSignInButton({
  disabled,
  onPress,
}: {
  disabled?: boolean;
  onPress(): void | Promise<void>;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google, to sync your tasks with Google Tasks"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          shadowColor: theme.shadow,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}>
      <View style={styles.icons}>
        <GoogleMark />
      </View>
      <View style={styles.labels}>
        <ThemedText type="smallBold" numberOfLines={1}>
          Continue with Google
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          to sync your tasks with Google Tasks
        </ThemedText>
      </View>
      <View style={styles.icons}>
        <GoogleTasksMark />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  icons: {
    width: 24,
    alignItems: 'center',
  },
  labels: {
    flex: 1,
    gap: 1,
  },
});
