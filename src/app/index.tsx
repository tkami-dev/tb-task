import { Link } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DraggableTodoList } from '@/components/draggable-todo-list';
import { SymbolIcon } from '@/components/symbol-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TodoInput } from '@/components/todo-input';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTodos } from '@/hooks/use-todos';

export default function TasksScreen() {
  const { todos, isReady, addTodo, toggleTodo, deleteTodo, reorderTodos } = useTodos();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ThemedText type="title" style={styles.title}>
                Tasks
              </ThemedText>
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
              <ThemedText type="smallBold">No tasks</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Add one task to start.
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
      </SafeAreaView>
    </ThemedView>
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
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.four }),
    paddingBottom: Spacing.four,
  },
  listContent: {
    paddingBottom: Spacing.four,
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
  title: {
    fontSize: 38,
    lineHeight: 42,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  emptyState: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
  },
});
