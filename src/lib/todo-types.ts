export type TodoItem = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  order?: number;
  googleTaskId?: string;
  deletedAt?: string;
};

export type GoogleConnection = {
  clientId: string;
  accessToken?: string;
  refreshToken: string;
  expiresAt?: number;
  scope?: string;
  taskListId?: string;
  connectedAt: string;
  lastSyncAt?: string;
};

export type TodoData = {
  todos: TodoItem[];
  google: GoogleConnection | null;
};

export const EMPTY_TODO_DATA: TodoData = {
  todos: [],
  google: null,
};

export function getVisibleTodos(todos: TodoItem[]) {
  return todos.filter((todo) => !todo.deletedAt);
}

function todoOrder(todo: TodoItem) {
  return todo.order ?? -Date.parse(todo.createdAt);
}

export function sortTodos(todos: TodoItem[]) {
  return [...todos].sort((left, right) => todoOrder(left) - todoOrder(right));
}
