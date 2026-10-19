import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { SymbolIcon } from '@/components/symbol-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTodos } from '@/hooks/use-todos';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { google, syncStatus, connectGoogle, disconnectGoogle, syncGoogle } = useTodos();
  const isBusy = syncStatus.kind === 'syncing';
  const isConnected = Boolean(google);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  // Left -> right swipe = back.
  const swipeBack = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-1000, 24])
        .failOffsetY([-14, 14])
        .onEnd((event) => {
          if (event.translationX > 70 || event.velocityX > 600) {
            goBack();
          }
        }),
    [goBack],
  );

  return (
    <GestureDetector gesture={swipeBack}>
      <View style={styles.screen}>
        <ThemedView style={styles.screen}>
          <ScrollView
            style={styles.screen}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: insets.top + Spacing.four,
                paddingBottom: insets.bottom + Spacing.five,
                paddingLeft: insets.left + Spacing.four,
                paddingRight: insets.right + Spacing.four,
              },
            ]}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={12}
                onPress={goBack}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                <SymbolIcon
                  name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                  size={30}
                />
              </Pressable>
              <View style={styles.titleBlock}>
                <ThemedText type="title" style={styles.title}>
                  Settings
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Sync your tasks with Google Tasks.
                </ThemedText>
              </View>
            </View>

            <View style={[styles.section, { borderColor: theme.border }]}>
              <View style={styles.rowBetween}>
                <ThemedText type="smallBold">Google Tasks</ThemedText>
                <ThemedText type="small" themeColor={isConnected ? 'success' : 'textSecondary'}>
                  {isConnected ? 'Connected' : 'Not connected'}
                </ThemedText>
              </View>

              {isConnected ? (
                <>
                  <View style={styles.actions}>
                    <SettingsButton label="Sync" disabled={isBusy} onPress={syncGoogle} />
                    <SettingsButton label="Disconnect" disabled={isBusy} onPress={disconnectGoogle} />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {google?.lastSyncAt
                      ? `Last synced ${new Date(google.lastSyncAt).toLocaleString()}`
                      : 'Not synced yet'}
                  </ThemedText>
                </>
              ) : (
                <GoogleSignInButton disabled={isBusy} onPress={connectGoogle} />
              )}

              {syncStatus.message && (
                <ThemedText
                  type="small"
                  style={{ color: syncStatus.kind === 'error' ? theme.danger : theme.textSecondary }}>
                  {syncStatus.message}
                </ThemedText>
              )}
            </View>
          </ScrollView>
        </ThemedView>
      </View>
    </GestureDetector>
  );
}

function SettingsButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress(): void | Promise<void>;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
      ]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.three,
  },
  titleBlock: {
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: -Spacing.one,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
    fontFamily: 'Ubuntu-Bold',
  },
  section: {
    gap: Spacing.three,
    borderTopWidth: 1,
    paddingTop: Spacing.four,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  button: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
});
