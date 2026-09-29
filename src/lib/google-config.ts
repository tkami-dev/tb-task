export const GOOGLE_TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';
export const GOOGLE_OAUTH_REDIRECT_URI = 'com.tb.todo:/oauth2redirect';

export const GOOGLE_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '').trim();

export const isGoogleConfigured = GOOGLE_CLIENT_ID.length > 0;
