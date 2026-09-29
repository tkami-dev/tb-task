import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { GOOGLE_CLIENT_ID, GOOGLE_OAUTH_REDIRECT_URI, GOOGLE_TASKS_SCOPE } from './google-config';
import type { GoogleConnection, TodoData, TodoItem } from './todo-types';
import { sortTodos } from './todo-types';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const TASKS_ENDPOINT = 'https://tasks.googleapis.com/tasks/v1';
const TOKEN_EXPIRY_BUFFER_MS = 60_000;
const GOOGLE_FETCH_TIMEOUT_MS = 15_000;
const RANDOM_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

type TokenResponseBody = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GoogleTask = {
  id?: string;
  title?: string;
  status?: string;
  updated?: string;
  deleted?: boolean;
  hidden?: boolean;
};

type GoogleTaskList = {
  id?: string;
  title?: string;
};

type GoogleListResponse<T> = {
  items?: T[];
};

class GoogleApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GoogleApiError';
    this.status = status;
  }
}

if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

async function randomOAuthString(length: number) {
  const bytes = await Crypto.getRandomBytesAsync(length);

  return Array.from(bytes, (byte) => RANDOM_ALPHABET[byte % RANDOM_ALPHABET.length]).join('');
}

function toBase64Url(base64: string) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createCodeChallenge(verifier: string) {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });

  return { method: 'S256', challenge: toBase64Url(digest) };
}

function parseCallbackParams(url: string) {
  const queryIndex = url.indexOf('?');
  const fragmentIndex = url.indexOf('#');
  const start = queryIndex >= 0 ? queryIndex + 1 : fragmentIndex >= 0 ? fragmentIndex + 1 : -1;

  if (start < 0) {
    return new URLSearchParams();
  }

  const end = queryIndex >= 0 && fragmentIndex > queryIndex ? fragmentIndex : url.length;
  return new URLSearchParams(url.slice(start, end));
}

function tokenExpiryFromNow(expiresIn?: number) {
  const seconds = typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? expiresIn : 3600;
  return Date.now() + Math.max(seconds * 1000 - TOKEN_EXPIRY_BUFFER_MS, TOKEN_EXPIRY_BUFFER_MS);
}

function tokenError(body: TokenResponseBody, fallback: string) {
  return body.error_description || body.error || fallback;
}

async function fetchGoogle(input: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, GOOGLE_FETCH_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Google connection timed out. Tasks stay saved locally.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function postTokenForm(form: URLSearchParams) {
  const response = await fetchGoogle(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponseBody;

  if (!response.ok || !body.access_token) {
    throw new Error(tokenError(body, 'Google returned an invalid token response.'));
  }

  return body;
}

async function ensureAccessToken(google: GoogleConnection) {
  if (google.accessToken && google.expiresAt && google.expiresAt > Date.now()) {
    return google;
  }

  const form = new URLSearchParams({
    client_id: google.clientId,
    refresh_token: google.refreshToken,
    grant_type: 'refresh_token',
  });
  const token = await postTokenForm(form);

  return {
    ...google,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? google.refreshToken,
    expiresAt: tokenExpiryFromNow(token.expires_in),
    scope: token.scope ?? google.scope,
  };
}

async function googleFetch<T>(google: GoogleConnection, path: string, init: RequestInit = {}) {
  let activeGoogle = await ensureAccessToken(google);
  let response = await fetchGoogle(`${TASKS_ENDPOINT}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${activeGoogle.accessToken}`,
    },
  });

  if (response.status === 401) {
    activeGoogle = await ensureAccessToken({ ...activeGoogle, accessToken: undefined, expiresAt: 0 });
    response = await fetchGoogle(`${TASKS_ENDPOINT}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${activeGoogle.accessToken}`,
      },
    });
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      typeof body?.error?.message === 'string'
        ? body.error.message
        : `Google Tasks request failed with ${response.status}.`;
    throw new GoogleApiError(message, response.status);
  }

  return { google: activeGoogle, body: body as T };
}

async function resolveTaskList(google: GoogleConnection) {
  if (google.taskListId) {
    return { google, taskListId: google.taskListId };
  }

  const result = await googleFetch<GoogleListResponse<GoogleTaskList>>(
    google,
    '/users/@me/lists?maxResults=100',
  );
  const taskList = result.body.items?.find((item) => item.id);

  if (!taskList?.id) {
    throw new Error('No Google Tasks list was found for this account.');
  }

  return {
    google: { ...result.google, taskListId: taskList.id },
    taskListId: taskList.id,
  };
}

async function listGoogleTasks(google: GoogleConnection, taskListId: string) {
  const params = new URLSearchParams({
    maxResults: '100',
    showCompleted: 'true',
    showHidden: 'true',
  });
  const result = await googleFetch<GoogleListResponse<GoogleTask>>(
    google,
    `/lists/${encodeURIComponent(taskListId)}/tasks?${params}`,
  );

  return {
    google: result.google,
    tasks: result.body.items?.filter((task) => task.id && !task.deleted) ?? [],
  };
}

async function insertGoogleTask(google: GoogleConnection, taskListId: string, todo: TodoItem) {
  const result = await googleFetch<GoogleTask>(google, `/lists/${encodeURIComponent(taskListId)}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskPayload(todo)),
  });

  if (!result.body.id) {
    throw new Error('Google created a task without an id.');
  }

  return { google: result.google, task: result.body };
}

async function patchGoogleTask(google: GoogleConnection, taskListId: string, todo: TodoItem) {
  const taskId = todo.googleTaskId;

  if (!taskId) {
    return { google };
  }

  const result = await googleFetch<GoogleTask>(
    google,
    `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskPayload(todo)),
    },
  );

  return { google: result.google };
}

async function deleteGoogleTask(google: GoogleConnection, taskListId: string, taskId: string) {
  try {
    const result = await googleFetch<null>(
      google,
      `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'DELETE' },
    );

    return { google: result.google };
  } catch (error) {
    if (error instanceof GoogleApiError && error.status === 404) {
      return { google };
    }

    throw error;
  }
}

function taskPayload(todo: TodoItem) {
  const payload: { title: string; status: 'completed' | 'needsAction'; completed?: string } = {
    title: todo.title,
    status: todo.completed ? 'completed' : 'needsAction',
  };

  if (todo.completed) {
    payload.completed = todo.updatedAt;
  }

  return payload;
}

function shouldPatchRemoteTask(remote: GoogleTask, todo: TodoItem) {
  const status = todo.completed ? 'completed' : 'needsAction';
  return remote.title !== todo.title || remote.status !== status;
}

function todoFromGoogleTask(task: GoogleTask): TodoItem | null {
  if (!task.id || !task.title) {
    return null;
  }

  const timestamp = task.updated ?? new Date().toISOString();

  return {
    id: `google-${task.id}`,
    title: task.title,
    completed: task.status === 'completed',
    createdAt: timestamp,
    updatedAt: timestamp,
    googleTaskId: task.id,
  };
}

function mergeUniqueTodos(todos: TodoItem[]) {
  const seen = new Set<string>();
  const merged: TodoItem[] = [];

  for (const todo of todos) {
    const key = todo.googleTaskId ?? todo.id;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(todo);
  }

  return sortTodos(merged);
}

export async function connectGoogleTasks() {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Set EXPO_PUBLIC_GOOGLE_CLIENT_ID to connect Google Tasks.');
  }

  if (Platform.OS === 'web') {
    throw new Error('Google Tasks connection is configured for native iOS and Android builds.');
  }

  const verifier = await randomOAuthString(64);
  const state = await randomOAuthString(32);
  const codeChallenge = await createCodeChallenge(verifier);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_TASKS_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    code_challenge: codeChallenge.challenge,
    code_challenge_method: codeChallenge.method,
    state,
  });
  const result = await WebBrowser.openAuthSessionAsync(
    `${AUTH_ENDPOINT}?${params.toString()}`,
    GOOGLE_OAUTH_REDIRECT_URI,
  );

  if (result.type !== 'success') {
    throw new Error('Google connection was cancelled.');
  }

  const callbackUrl = 'url' in result ? result.url : Linking.getLinkingURL();
  const callbackParams = parseCallbackParams(callbackUrl ?? '');
  const error = callbackParams.get('error');
  const code = callbackParams.get('code');

  if (error) {
    throw new Error(error);
  }

  if (!code || callbackParams.get('state') !== state) {
    throw new Error('Google returned an invalid OAuth response.');
  }

  const token = await postTokenForm(
    new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
    }),
  );

  if (!token.refresh_token) {
    throw new Error('Google did not return a refresh token. Revoke app access and connect again.');
  }

  return {
    clientId: GOOGLE_CLIENT_ID,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: tokenExpiryFromNow(token.expires_in),
    scope: token.scope,
    connectedAt: new Date().toISOString(),
  } satisfies GoogleConnection;
}

export async function syncTodosWithGoogle(data: TodoData) {
  if (!data.google) {
    return data;
  }

  let activeGoogle = await ensureAccessToken(data.google);
  const taskListResult = await resolveTaskList(activeGoogle);
  activeGoogle = taskListResult.google;
  const taskListId = taskListResult.taskListId;
  const listed = await listGoogleTasks(activeGoogle, taskListId);
  activeGoogle = listed.google;

  const remoteById = new Map(listed.tasks.map((task) => [task.id, task]));
  const mappedGoogleIds = new Set<string>();
  const nextTodos: TodoItem[] = [];

  for (const todo of data.todos) {
    if (todo.deletedAt) {
      if (todo.googleTaskId) {
        const deleted = await deleteGoogleTask(activeGoogle, taskListId, todo.googleTaskId);
        activeGoogle = deleted.google;
      }

      continue;
    }

    let nextTodo = todo;
    const remote = todo.googleTaskId ? remoteById.get(todo.googleTaskId) : undefined;

    if (!todo.googleTaskId || !remote) {
      const inserted = await insertGoogleTask(activeGoogle, taskListId, todo);
      activeGoogle = inserted.google;
      nextTodo = { ...todo, googleTaskId: inserted.task.id, updatedAt: new Date().toISOString() };
      mappedGoogleIds.add(inserted.task.id!);
    } else {
      mappedGoogleIds.add(todo.googleTaskId);

      if (shouldPatchRemoteTask(remote, todo)) {
        const patched = await patchGoogleTask(activeGoogle, taskListId, todo);
        activeGoogle = patched.google;
      }
    }

    nextTodos.push(nextTodo);
  }

  for (const remoteTask of listed.tasks) {
    if (!remoteTask.id || mappedGoogleIds.has(remoteTask.id)) {
      continue;
    }

    const remoteTodo = todoFromGoogleTask(remoteTask);

    if (remoteTodo) {
      nextTodos.push(remoteTodo);
    }
  }

  return {
    todos: mergeUniqueTodos(nextTodos),
    google: {
      ...activeGoogle,
      taskListId,
      lastSyncAt: new Date().toISOString(),
    },
  } satisfies TodoData;
}
