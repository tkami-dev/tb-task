import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import * as Crypto from 'expo-crypto';

import { connectGoogleTasks, syncTodosWithGoogle } from '@/lib/google-tasks';
import { loadTodoData, saveTodoData } from '@/lib/todo-storage';
import { EMPTY_TODO_DATA, getVisibleTodos, sortTodos, type TodoData, type TodoItem } from '@/lib/todo-types';

type SyncStatus = {
  kind: 'idle' | 'loading' | 'syncing' | 'success' | 'error';
  message?: string;
};

type TodoContextValue = {
  todos: TodoItem[];
  activeCount: number;
  completedCount: number;
  isReady: boolean;
  google: TodoData['google'];
  syncStatus: SyncStatus;
  addTodo(title: string): Promise<void>;
  toggleTodo(id: string): Promise<void>;
  deleteTodo(id: string): Promise<void>;
  reorderTodos(orderedIds: string[]): Promise<void>;
  connectGoogle(): Promise<void>;
  disconnectGoogle(): Promise<void>;
  syncGoogle(): Promise<void>;
};

const TodoContext = createContext<TodoContextValue | null>(null);

function createTodo(title: string, order: number): TodoItem {
  const now = new Date().toISOString();
  const random = Crypto.randomUUID();

  return {
    id: `todo-${random}`,
    title,
    completed: false,
    createdAt: now,
    updatedAt: now,
    order,
  };
}

function stripGoogleIds(todos: TodoItem[]) {
  return todos.map(({ googleTaskId, deletedAt, ...todo }) => todo);
}

function getInitialOrder(todos: TodoItem[]) {
  if (todos.length === 0) {
    return 0;
  }

  return Math.min(...todos.map((todo) => todo.order ?? -Date.parse(todo.createdAt))) - 1;
}

export function TodoProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<TodoData>(EMPTY_TODO_DATA);
  const [isReady, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: 'loading', message: 'Loading tasks' });
  const syncInFlight = useRef(false);

  useEffect(() => {
    let isMounted = true;

    loadTodoData()
      .then((storedData) => {
        if (!isMounted) {
          return;
        }

        setData({ ...storedData, todos: sortTodos(storedData.todos) });
        setSyncStatus({ kind: 'idle' });
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setSyncStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Could not load local tasks.',
        });
      })
      .finally(() => {
        if (isMounted) {
          setReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const commit = useCallback(async (nextData: TodoData) => {
    const normalizedData = { ...nextData, todos: sortTodos(nextData.todos) };
    setData(normalizedData);
    await saveTodoData(normalizedData);
  }, []);

  const runGoogleSync = useCallback(
    async (sourceData: TodoData) => {
      if (!sourceData.google || syncInFlight.current) {
        return;
      }

      syncInFlight.current = true;
      setSyncStatus({ kind: 'syncing', message: 'Syncing Google Tasks' });

      try {
        const syncedData = await syncTodosWithGoogle(sourceData);
        await commit(syncedData);
        setSyncStatus({ kind: 'success', message: 'Synced with Google Tasks' });
      } catch (error) {
        setSyncStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Google sync failed.',
        });
      } finally {
        syncInFlight.current = false;
      }
    },
    [commit],
  );

  const addTodo = useCallback(
    async (title: string) => {
      const cleanTitle = title.trim();

      if (!cleanTitle) {
        return;
      }

      const nextData = {
        ...data,
        todos: [createTodo(cleanTitle, getInitialOrder(data.todos)), ...data.todos],
      };
      await commit(nextData);
      void runGoogleSync(nextData);
    },
    [commit, data, runGoogleSync],
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      const nextData = {
        ...data,
        todos: data.todos.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed, updatedAt: now } : todo,
        ),
      };

      await commit(nextData);
      void runGoogleSync(nextData);
    },
    [commit, data, runGoogleSync],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      const nextTodos = data.google
        ? data.todos
            .map((todo) => (todo.id === id ? { ...todo, deletedAt: now, updatedAt: now } : todo))
            .filter((todo) => todo.id !== id || todo.googleTaskId)
        : data.todos.filter((todo) => todo.id !== id);
      const nextData = { ...data, todos: nextTodos };

      await commit(nextData);
      void runGoogleSync(nextData);
    },
    [commit, data, runGoogleSync],
  );

  const reorderTodos = useCallback(
    async (orderedIds: string[]) => {
      const now = new Date().toISOString();
      const orderById = new Map(orderedIds.map((id, index) => [id, index]));
      const nextData = {
        ...data,
        todos: data.todos.map((todo) => {
          const order = orderById.get(todo.id);

          return order === undefined ? todo : { ...todo, order, updatedAt: now };
        }),
      };

      await commit(nextData);
      void runGoogleSync(nextData);
    },
    [commit, data, runGoogleSync],
  );

  const connectGoogle = useCallback(
    async () => {
      setSyncStatus({ kind: 'syncing', message: 'Connecting Google Tasks' });

      try {
        const google = await connectGoogleTasks();
        const syncedData = await syncTodosWithGoogle({ ...data, google });
        await commit(syncedData);
        setSyncStatus({ kind: 'success', message: 'Connected to Google Tasks' });
      } catch (error) {
        setSyncStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Google connection failed.',
        });
      }
    },
    [commit, data],
  );

  const disconnectGoogle = useCallback(async () => {
    const nextData = {
      todos: stripGoogleIds(getVisibleTodos(data.todos)),
      google: null,
    } satisfies TodoData;

    await commit(nextData);
    setSyncStatus({ kind: 'idle' });
  }, [commit, data.todos]);

  const syncGoogle = useCallback(async () => {
    await runGoogleSync(data);
  }, [data, runGoogleSync]);

  const visibleTodos = useMemo(() => sortTodos(getVisibleTodos(data.todos)), [data.todos]);
  const completedCount = visibleTodos.filter((todo) => todo.completed).length;
  const contextValue = useMemo(
    () => ({
      todos: visibleTodos,
      activeCount: visibleTodos.length - completedCount,
      completedCount,
      isReady,
      google: data.google,
      syncStatus,
      addTodo,
      toggleTodo,
      deleteTodo,
      reorderTodos,
      connectGoogle,
      disconnectGoogle,
      syncGoogle,
    }),
    [
      addTodo,
      completedCount,
      connectGoogle,
      data.google,
      deleteTodo,
      disconnectGoogle,
      isReady,
      reorderTodos,
      syncGoogle,
      syncStatus,
      toggleTodo,
      visibleTodos,
    ],
  );

  return <TodoContext.Provider value={contextValue}>{children}</TodoContext.Provider>;
}

export function useTodos() {
  const context = useContext(TodoContext);

  if (!context) {
    throw new Error('useTodos must be used inside TodoProvider.');
  }

  return context;
}
