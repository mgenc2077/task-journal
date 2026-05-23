# Task Journal

Expo SDK 56 app (React Native 0.85, React 19) with file-based routing. A task journal with a calendar view and SQLite storage.

## Commands

- `npm start` / `npx expo start` — dev server
- `npm run android` / `npm run ios` / `npm run web` — platform-specific
- `npm run lint` — runs `expo lint` (ESLint via expo-config-expo)
- No test runner is configured.

## Architecture

- **Router entry**: `src/app/` (not the default root `app/`). Expo Router file-based routing with `typedRoutes` enabled.
- **Path aliases**: `@/*` → `./src/*`, `@/assets/*` → `./assets/*` (configured in tsconfig.json).
- **Navigation**: Stack root with `NativeTabs` inside a `(tabs)` route group. The task detail screen (`task/[date]`) is pushed onto the stack.
- **Tabs**: `src/app/(tabs)/_layout.tsx` uses `NativeTabs` from `expo-router/unstable-native-tabs`. Tab triggers: `index` (Journal), `all-tasks` (All Tasks).
- **Database**: `expo-sqlite` with `SQLiteProvider` wrapping the root layout. Schema and migrations in `src/db/schema.ts`. CRUD helpers in `src/db/tasks.ts`. Use `useSQLiteContext()` hook to access the db.
- **Theming**: `src/constants/theme.ts` defines colors, spacing, and fonts. It imports `src/global.css` — do not remove that import.
- **Dark mode**: `Colors` object keyed by `light`/`dark`; components use `useTheme()` hook and `ThemedView`/`ThemedText`.

## Key directories

- `src/app/(tabs)/` — Tab screens (calendar index, all-tasks)
- `src/app/task/[date].tsx` — Task detail for a specific date (pushed via stack, not a tab)
- `src/db/` — SQLite schema, migrations, CRUD operations
- `src/types/` — Shared TypeScript interfaces
- `src/components/calendar/` — Calendar grid component
- `src/components/task/` — Task form and task item components

## Platform-specific code

Some files have `.web.tsx` / `.web.ts` variants and `.module.css` styles. React Native's platform extension resolution picks these up automatically. When editing a component, check if a `.web.*` counterpart exists.

## Key constraints

- **TypeScript strict mode** is enabled.
- **React Compiler** experiment is on (`app.json` → `experiments.reactCompiler`). Do not use manual `useCallback`/`useMemo`/`memo` — the compiler handles memoization. The compiler will error on: setState called synchronously in effects, non-serializable closures in JSX props, or incorrect dependency arrays.
- Native `/ios` and `/android` directories are gitignored; this is a managed Expo project.
- **Typed routes** are enabled. Use object form for dynamic routes: `router.push({ pathname: '/task/[date]', params: { date } })`.

## Expo SDK 56

Read the versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing code. SDK 56 APIs differ significantly from older tutorials.
