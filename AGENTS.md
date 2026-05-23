# Task Journal

Expo SDK 56 app (React Native 0.85, React 19) with file-based routing. A task journal with a calendar view, repeated task templates, categories, SQLite storage, and LAN sync.

## Commands

- `npm start` / `npx expo start` — dev server
- `npm run android` / `npm run ios` / `npm run web` — platform-specific
- `npm run lint` — runs `expo lint` (ESLint via eslint-config-expo)
- No test runner is configured.

## Architecture

- **Router entry**: `src/app/` (not the default root `app/`). Expo Router file-based routing with `typedRoutes` enabled.
- **Path aliases**: `@/*` → `./src/*`, `@/assets/*` → `./assets/*` (configured in tsconfig.json).
- **Navigation**: Stack root with standard `Tabs` inside a `(tabs)` route group. Task detail screen (`task/[date]`) is pushed onto the stack.
- **Tabs**: Journal (calendar), All Tasks, Repeat (templates), Settings. Icons use `expo-symbols` (`SymbolView`) with platform-specific names (SF Symbols on iOS, Material Symbols on Android).
- **Database**: `expo-sqlite` with `SQLiteProvider` wrapping the root layout. Schema v5: UUIDv7 string IDs, Unix ms timestamps, soft deletes. Use `useSQLiteContext()` hook to access the db.
- **Theming**: `src/constants/theme.ts` defines colors, spacing, and fonts. It imports `src/global.css` — do not remove that import.
- **Dark mode**: `Colors` object keyed by `light`/`dark`; components use `useTheme()` hook and `ThemedView`/`ThemedText`.
- **Sync**: Timestamp-based incremental sync over HTTP JSON. Client sends local changes, server returns changes since last sync. Last-write-wins with server-wins-on-tie conflict resolution.

## Key directories

- `src/app/(tabs)/` — Tab screens (Journal, All Tasks, Repeat, Settings)
- `src/app/task/[date].tsx` — Task detail for a specific date (pushed via stack)
- `src/db/` — SQLite schema, migrations, CRUD operations, sync logic
- `src/types/` — Shared TypeScript interfaces (Task, RepeatedTask, Category)
- `src/utils/` — UUIDv7 generation
- `src/components/calendar/` — Calendar grid component
- `src/components/task/` — Task form, task item, category picker, repeated task picker
- `sync-engine/` — Go sync server (separate binary/Docker image)

## Database schema (v5)

All tables use UUIDv7 string IDs and Unix millisecond timestamps. Deletes are soft (`deleted_at` column). Synced tables are `tasks`, `repeated_tasks`, and `categories`. The `settings` table is local-only (not synced).

```
tasks           — id (UUIDv7), date, title, notes, created_at, updated_at, deleted_at
repeated_tasks  — id, title, default_notes, category_id (FK), created_at, updated_at, deleted_at
categories      — id, name, created_at, updated_at, deleted_at
settings        — key, value (local preferences)
sync_meta       — key, value (sync state tracking)
```

## Platform-specific code

Some files have `.web.tsx` / `.web.ts` variants and `.module.css` styles. React Native's platform extension resolution picks these up automatically. When editing a component, check if a `.web.*` counterpart exists.

## Key constraints

- **TypeScript strict mode** is enabled.
- **React Compiler** experiment is on (`app.json` → `experiments.reactCompiler`). Do not use manual `useCallback`/`useMemo`/`memo` — the compiler handles memoization. The compiler will error on: setState called synchronously in effects, non-serializable closures in JSX props, or incorrect dependency arrays.
- Native `/ios` and `/android` directories are gitignored; this is a managed Expo project.
- **Typed routes** are enabled. Use object form for dynamic routes: `router.push({ pathname: '/task/[date]', params: { date } })`.
- **IDs are UUIDv7 strings** — use `generateUUIDv7()` from `src/utils/uuid.ts` when creating records. Never use auto-increment.
- **Soft deletes** — always use the `deleteTask`/`deleteRepeatedTask`/`deleteCategory` helpers which set `deleted_at`. UI queries filter with `WHERE deleted_at IS NULL`.
- **`@expo/vector-icons` is broken on SDK 56** (font file resolution fails). Use `expo-symbols` (`SymbolView`) instead.

## Sync engine

The `sync-engine/` directory contains a standalone Go server that synchronizes data between clients over LAN. See `sync-engine/README.md` for server docs and `sync-engine/ADAPTATION.md` for reusing it in other apps.

- **Protocol**: `POST /sync` with JSON payload. Incremental sync based on `updated_at` timestamps.
- **Conflict resolution**: Server wins on tie (`server.updated_at >= client.updated_at`).
- **Initial sync**: Server accepts data on first sync (no rebuild required).

## Expo SDK 56

Read the versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing code. SDK 56 APIs differ significantly from older tutorials.

## Relevant files

| File | Purpose |
|---|---|
| `src/app/_layout.tsx` | Root layout: SQLiteProvider + ThemeProvider + View wrapper + Stack |
| `src/app/(tabs)/_layout.tsx` | Tab navigator: standard Tabs with expo-symbols icons |
| `src/app/(tabs)/index.tsx` | Journal: calendar + selected day tasks + overlay form |
| `src/app/(tabs)/all-tasks.tsx` | All tasks grouped by date |
| `src/app/(tabs)/repeated-tasks.tsx` | Repeated task templates with categories, history, edit |
| `src/app/(tabs)/settings.tsx` | Preferences (first day of week) + sync configuration |
| `src/app/task/[date].tsx` | Standalone task detail (for All Tasks navigation) |
| `src/components/calendar/calendar-grid.tsx` | Month grid with task titles, selectedDate highlight |
| `src/components/task/task-form.tsx` | Title + notes form |
| `src/components/task/task-item.tsx` | Task card |
| `src/components/task/category-picker.tsx` | Category selection overlay with CRUD |
| `src/components/task/repeated-task-picker.tsx` | Searchable template picker for Journal overlay |
| `src/db/schema.ts` | Schema v5: migrations, all table definitions |
| `src/db/tasks.ts` | Task CRUD + `getTasksSince` + `upsertTask` for sync |
| `src/db/repeated-tasks.ts` | RepeatedTask CRUD + history + sync helpers |
| `src/db/categories.ts` | Category CRUD + sync helpers |
| `src/db/settings.ts` | getSetting/setSetting for local preferences |
| `src/db/sync.ts` | `performSync()` — full sync orchestration via fetch |
| `src/db/sync-settings.ts` | Sync URL + last sync timestamp get/set |
| `src/utils/uuid.ts` | UUIDv7 generation using Date.now() + Math.random() |
| `src/types/task.ts` | Task, NewTask, TaskUpdate types |
| `src/types/repeated-task.ts` | RepeatedTask, NewRepeatedTask, RepeatedTaskUpdate types |
| `src/types/category.ts` | Category, NewCategory types |
| `src/constants/theme.ts` | Colors, Spacing, Fonts (imports global.css) |
