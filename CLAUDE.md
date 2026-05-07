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
**After every meaningful change, commit to `main` and push.**

1. Stage the changed files explicitly (avoid `git add -A`)
2. Write a concise commit message describing *why*, not just *what*
3. Push to `main`:
   ```
   git push -u origin main
   ```
4. If working on a feature branch, merge it into `main` and push `main` when done.

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
