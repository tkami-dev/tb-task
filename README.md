# tb-todo

A small Expo Router to-do app:

- **Tasks**: add, complete, drag-reorder, and remove tasks.
- **Settings**: connect/disconnect Google Tasks and run manual sync.

Local mode stores tasks on-device in an Expo FileSystem JSON store, with web using localStorage for development. Google Tasks sync uses browser OAuth with no backend server.

The app opens and works offline by default. Network is only used when you connect Google Tasks, press Sync, or edit tasks while a Google connection is saved.

## Run

```bash
bun install
cp .env.example .env
bunx expo start
```

## Google Tasks setup

1. Enable the Google Tasks API in Google Cloud.
2. Create an OAuth client of type **installed app** (native).
3. Add this redirect URI to the OAuth client:

   ```text
   com.tb.todo:/oauth2redirect
   ```

4. Put the client id in `.env`:

   ```bash
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

5. Restart the dev server, open **Settings**, and tap **Continue with Google**.

The requested scope is:

```text
https://www.googleapis.com/auth/tasks
```

Web keeps local tasks only; Google OAuth is configured for native custom-scheme redirects.
