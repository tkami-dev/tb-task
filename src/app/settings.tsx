import { Link } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTodos } from '@/hooks/use-todos';

export default function SettingsScreen() {
  const theme = useTheme();
  const { google, syncStatus, connectGoogle, disconnectGoogle, syncGoogle } = useTodos();
  const isBusy = syncStatus.kind === 'syncing';
  const isConnected = Boolean(google);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Link href="/" asChild>
              <Pressable hitSlop={12} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Back
                </ThemedText>
              </Pressable>
            </Link>
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
      </SafeAreaView>
    </ThemedView>
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
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.four }),
    paddingBottom: Spacing.four,
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
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
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
