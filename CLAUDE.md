# Enigma Game — Claude Code Guidelines

## Project Overview
Enigma is a multiplayer 20-questions party game. Stack:
- **Frontend (web)**: React + Vite (`enigma-game.jsx`)
- **Mobile**: React Native / Expo SDK 54 (`enigma-native/`)
- **Backend**: Node.js + Express on Railway (`server.js`)
- **Database + Realtime**: Supabase (PostgreSQL + Realtime)

## Key Files
- `enigma-native/src/EnigmaGame.js` — main mobile game component
- `enigma-native/src/config/supabase.js` — Supabase client (uses `expo-constants` extras)
- `enigma-native/app.json` — Expo config including Supabase keys in `extra`
- `server.js` — Express API server (session CRUD)
- `.env` — Supabase keys for local dev (safe to commit; anon key is public-safe)
- `supabase/schema.sql` — PostgreSQL schema with RLS and Realtime publication

## Git Workflow — Required Practice
**Always push directly to `main`. Never use the GitHub API (`mcp__github__push_files`, `create_or_update_file`, etc.) for code commits.**

1. Stage the changed files explicitly (avoid `git add -A`)
2. Write a concise commit message describing *why*, not just *what*
3. Push to `main` with the standard git CLI:
   ```
   git push -u origin main
   ```
4. A push must complete in under 2 seconds. If `git push origin main` fails with HTTP 403 (proxy block) or any other error, STOP immediately and tell the user — do NOT fall back to the GitHub MCP API, do NOT read files into context to push via API, do NOT spawn a sub-agent to push via API. Each of those wastes large amounts of tokens.
5. Feature-branch development is allowed only as a transient step; merge into `main` and push `main` before ending the task.

This keeps the repo always deployable and prevents work from being lost across sessions.

## Environment Notes
- `react-native-url-polyfill/auto` must be imported first in `supabase.js` (iOS URL API)
- Expo Go on device requires **SDK 54** — do not upgrade beyond `expo: ~54.0.0`
- Railway reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from its env dashboard
- Local dev: `npm run dev` (server) + `cd enigma-native && npx expo start` (mobile)

## Mobile Build
```bash
cd enigma-native
npm install --legacy-peer-deps
eas build --platform ios --profile production   # production TestFlight build
eas build --platform ios --profile preview       # quick preview build
```
