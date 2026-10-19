import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraggableTodoList } from '@/components/draggable-todo-list';
import { SymbolIcon } from '@/components/symbol-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TodoInput } from '@/components/todo-input';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTodos } from '@/hooks/use-todos';

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export default function TasksScreen() {
  const { todos, isReady, addTodo, toggleTodo, deleteTodo, reorderTodos } = useTodos();
  const insets = useSafeAreaInsets();
  return (
    <>
        <ThemedView style={styles.screen}>
          <ScrollView
            style={styles.screen}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.listContent,
              {
                paddingTop: insets.top + Spacing.four,
                paddingBottom: insets.bottom + Spacing.five,
                paddingLeft: insets.left + Spacing.four,
                paddingRight: insets.right + Spacing.four,
              },
            ]}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
                    {today}
                  </ThemedText>
                  <ThemedText type="title" style={styles.title}>
                    Tasks
                  </ThemedText>
                </View>
                <Link href="/settings" asChild>
                  <Pressable
                    accessibilityLabel="Settings"
                    hitSlop={12}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                    <SymbolIcon
                      name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                      size={20}
                    />
                  </Pressable>
                </Link>
              </View>

              <TodoInput onAdd={addTodo} disabled={!isReady} />
            </View>

            {todos.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <SymbolIcon
                    name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
                    size={32}
                  />
                </View>
                <ThemedText type="smallBold">All clear</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Nothing to do. Add a task above to get started.
                </ThemedText>
              </View>
            ) : (
              <DraggableTodoList
                todos={todos}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onReorder={reorderTodos}
              />
            )}
          </ScrollView>
        </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  date: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
    fontFamily: 'Ubuntu-Bold',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  pressed: {
    opacity: 0.6,
  },
  emptyState: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.12)',
    marginBottom: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
  },
});
