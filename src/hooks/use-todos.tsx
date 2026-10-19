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

// Sync cholar somoy user je change korse seta overwrite na kore merge kore.
function mergeSynced(latest: TodoData, source: TodoData, synced: TodoData): TodoData {
  if (!latest.google) return latest;
  if (latest === source) return synced;

  const sourceById = new Map(source.todos.map((todo) => [todo.id, todo]));
  const syncedById = new Map(synced.todos.map((todo) => [todo.id, todo]));
  const latestIds = new Set(latest.todos.map((todo) => todo.id));

  const todos = latest.todos.map((todo) => {
    const remote = syncedById.get(todo.id);
    if (!remote) return todo;
    if (sourceById.get(todo.id)?.updatedAt === todo.updatedAt) return remote;
    return { ...todo, googleTaskId: remote.googleTaskId ?? todo.googleTaskId };
  });
  const pulled = synced.todos.filter((todo) => !latestIds.has(todo.id) && !sourceById.has(todo.id));

  return { ...synced, todos: [...todos, ...pulled] };
}

export function TodoProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<TodoData>(EMPTY_TODO_DATA);
  const [isReady, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: 'loading', message: 'Loading tasks' });
  const dataRef = useRef<TodoData>(EMPTY_TODO_DATA);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const syncInFlight = useRef(false);

  useEffect(() => {
    let isMounted = true;

    loadTodoData()
      .then((storedData) => {
        if (!isMounted) {
          return;
        }

        const loaded = { ...storedData, todos: sortTodos(storedData.todos) };
        dataRef.current = loaded;
        setData(loaded);
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

  const commit = useCallback((nextData: TodoData) => {
    const normalized = { ...nextData, todos: sortTodos(nextData.todos) };
    dataRef.current = normalized;
    setData(normalized);

    const saved = saveChain.current.catch(() => undefined).then(() => saveTodoData(normalized));
    saveChain.current = saved;

    return saved.then(() => normalized);
  }, []);

  const runGoogleSync = useCallback(async () => {
    if (syncInFlight.current) {
      return;
    }

    syncInFlight.current = true;

    try {
      let again = true;

      while (again) {
        const source = dataRef.current;

        if (!source.google) {
          break;
        }

        setSyncStatus({ kind: 'syncing', message: 'Syncing Google Tasks' });
        const synced = await syncTodosWithGoogle(source);
        const latest = dataRef.current;

        again = latest !== source;
        await commit(mergeSynced(latest, source, synced));
      }

      setSyncStatus({ kind: 'success', message: 'Synced with Google Tasks' });
    } catch (error) {
      setSyncStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Google sync failed.',
      });
    } finally {
      syncInFlight.current = false;
    }
  }, [commit]);

  const addTodo = useCallback(
    async (title: string) => {
      const cleanTitle = title.trim();

      if (!cleanTitle) {
        return;
      }

      const current = dataRef.current;
      await commit({
        ...current,
        todos: [createTodo(cleanTitle, getInitialOrder(current.todos)), ...current.todos],
      });
      void runGoogleSync();
    },
    [commit, runGoogleSync],
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      const current = dataRef.current;

      await commit({
        ...current,
        todos: current.todos.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed, updatedAt: now } : todo,
        ),
      });
      void runGoogleSync();
    },
    [commit, runGoogleSync],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      const current = dataRef.current;
      const nextTodos = current.google
        ? current.todos
            .map((todo) => (todo.id === id ? { ...todo, deletedAt: now, updatedAt: now } : todo))
            .filter((todo) => todo.id !== id || todo.googleTaskId)
        : current.todos.filter((todo) => todo.id !== id);

      await commit({ ...current, todos: nextTodos });
      void runGoogleSync();
    },
    [commit, runGoogleSync],
  );

  const reorderTodos = useCallback(
    async (orderedIds: string[]) => {
      const now = new Date().toISOString();
      const orderById = new Map(orderedIds.map((id, index) => [id, index]));
      const current = dataRef.current;

      await commit({
        ...current,
        todos: current.todos.map((todo) => {
          const order = orderById.get(todo.id);

          return order === undefined ? todo : { ...todo, order, updatedAt: now };
        }),
      });
      void runGoogleSync();
    },
    [commit, runGoogleSync],
  );

  const connectGoogle = useCallback(async () => {
    setSyncStatus({ kind: 'syncing', message: 'Connecting Google Tasks' });

    try {
      const google = await connectGoogleTasks();
      const base = { ...dataRef.current, google };
      const synced = await syncTodosWithGoogle(base);

      await commit(mergeSynced({ ...dataRef.current, google }, base, synced));
      setSyncStatus({ kind: 'success', message: 'Connected to Google Tasks' });
    } catch (error) {
      setSyncStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Google connection failed.',
      });
    }
  }, [commit]);

  const disconnectGoogle = useCallback(async () => {
    await commit({
      todos: stripGoogleIds(getVisibleTodos(dataRef.current.todos)),
      google: null,
    } satisfies TodoData);
    setSyncStatus({ kind: 'idle' });
  }, [commit]);

  const syncGoogle = useCallback(async () => {
    await runGoogleSync();
  }, [runGoogleSync]);

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
