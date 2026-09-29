import { Platform } from 'react-native';

import { EMPTY_TODO_DATA, type GoogleConnection, type TodoData, type TodoItem } from './todo-types';

const STORE_FILE = 'tb-todo-store.json';
const STORE_KEY = 'tb-todo:store:v1';

type WebStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};


function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeTodo(value: unknown): TodoItem | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const todo = value as Partial<TodoItem>;
  const id = readString(todo.id);
  const title = readString(todo.title);
  const createdAt = readString(todo.createdAt);
  const updatedAt = readString(todo.updatedAt);

  if (!id || !title || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    title,
    completed: todo.completed === true,
    createdAt,
    updatedAt,
    order: readNumber(todo.order),
    googleTaskId: readString(todo.googleTaskId),
    deletedAt: readString(todo.deletedAt),
  };
}

function normalizeGoogle(value: unknown): GoogleConnection | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const google = value as Partial<GoogleConnection>;
  const clientId = readString(google.clientId);
  const refreshToken = readString(google.refreshToken);
  const connectedAt = readString(google.connectedAt);

  if (!clientId || !refreshToken || !connectedAt) {
    return null;
  }

  return {
    clientId,
    refreshToken,
    connectedAt,
    accessToken: readString(google.accessToken),
    expiresAt: readNumber(google.expiresAt),
    scope: readString(google.scope),
    taskListId: readString(google.taskListId),
    lastSyncAt: readString(google.lastSyncAt),
  };
}

function normalizeTodoData(value: unknown): TodoData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return EMPTY_TODO_DATA;
  }

  const data = value as Partial<TodoData>;
  const todos = Array.isArray(data.todos)
    ? data.todos.map(normalizeTodo).filter((todo): todo is TodoItem => todo !== null)
    : [];

  return {
    todos,
    google: normalizeGoogle(data.google),
  };
}

function getWebStorage() {
  return (globalThis as typeof globalThis & { localStorage?: WebStorage }).localStorage;
}


async function readNativeStore() {
  const { File, Paths } = await import('expo-file-system');
  const store = new File(Paths.document, STORE_FILE);

  if (!store.exists) {
    return null;
  }

  return store.text();
}

async function writeNativeStore(content: string) {
  const { File, Paths } = await import('expo-file-system');
  const store = new File(Paths.document, STORE_FILE);
  store.create({ intermediates: true, overwrite: true });
  store.write(content);
}

export async function loadTodoData() {
  const stored =
    Platform.OS === 'web' ? (getWebStorage()?.getItem(STORE_KEY) ?? null) : await readNativeStore();

  if (!stored) {
    return EMPTY_TODO_DATA;
  }

  try {
    return normalizeTodoData(JSON.parse(stored));
  } catch {
    return EMPTY_TODO_DATA;
  }
}

export async function saveTodoData(data: TodoData) {
  const serialized = JSON.stringify(data);

  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(STORE_KEY, serialized);
    return;
  }

  await writeNativeStore(serialized);
}
