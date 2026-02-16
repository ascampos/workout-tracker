# Architecture & Design Review Prompt

Copy the content below and paste it into an LLM to get suggestions for improving the design and architecture of this workout tracker app.

---

## Prompt

You are an expert software architect reviewing a workout tracking web application. I'll provide context about the app's structure, tech stack, and current implementation. Please analyze it and suggest concrete improvements to the design and architecture. Prioritize your recommendations and explain the tradeoffs.

### App Overview

**Purpose:** A personal workout tracker that lets users log sets (weight, reps, notes) for exercises organized into 4 workout days (Upper A, Lower A, Upper B, Lower B). Users can view progress charts, workout history, and edit/delete past sets.

**Tech Stack:**
- **Framework:** TanStack Start (React full-stack, SSR-capable)
- **Routing:** TanStack Router (file-based)
- **Data storage:** Google Sheets API (single spreadsheet, `set_log` sheet)
- **Auth:** Passcode-based session (single shared passcode)
- **Styling:** Tailwind CSS v4
- **Build:** Vite

### Current Architecture

**Routes:**
- `/login` — Passcode login
- `/` — Home: pick workout day, recent sessions list
- `/workout/$dayKey` — List exercises for a day
- `/workout/$dayKey/$exerciseKey` — Log sets for an exercise (chart, stats, last workout, weight/reps presets)
- `/charts` — Progress charts by exercise (dropdown selector)
- `/history` — All sessions with edit/delete
- `/session/$sessionId` — Single session detail with edit/delete

**Data Layer:**
- `src/utils/sheets.ts` — Raw Google Sheets API: `appendSetLogRows`, `getSetLogHistory`, `getAllSetLogRows`, `updateSetLogById`, `deleteSetLogById`
- `src/utils/log-sets.ts` — Server functions (`createServerFn`): `logSetsFn`, `getHistoryFn`, `getSessionHistoryFn`, `updateSetFn`, `deleteSetFn`
- `src/data/templates.ts` — Static workout templates (day keys, exercise lists)
- `src/utils/session.ts` — TanStack session wrapper

**Key Patterns:**
- No TanStack Query or similar — data fetching via `useEffect` + server function calls
- Draft persistence in `sessionStorage` for unsaved sets
- Session ID = `YYYY-MM-DD-{dayKey}` (one session per calendar day per workout type)
- `set_log` schema: id, timestamp, session_id, day_key, exercise_key, unit, weight, reps, notes, updated_at

### Known Issues / Areas of Concern

1. **Code duplication:** `topSetPerSession` and `SimpleLineChart` are duplicated in `charts.tsx` and `workout.$dayKey.$exerciseKey.tsx`. Exercise list derivation exists in both `charts.tsx` and `templates.ts` (`getAllExercises`).

2. **Data fetching:** No caching, no invalidation strategy. Each route fetches independently. After saving sets, the exercise page doesn't refresh history; after edit/delete in history, no shared cache to update.

3. **Large route file:** `workout.$dayKey.$exerciseKey.tsx` is ~520 lines — contains `ExercisePage`, `SelectModal`, `SimpleLineChart`, draft helpers, and all state logic.

4. **Sheets as database:** Single spreadsheet, no multi-user isolation. Header parsing logic is repeated in `getSetLogHistory` and `getAllSetLogRows`. Row indexing assumes `set_log` is first sheet.

5. **Auth:** Single passcode for all users. No user identity, so all data is shared.

6. **Types:** Some types live in `log-sets.ts`, others in `sheets.ts`. `HistoryRow` vs `HistoryEntry` vs `SessionSet` — overlapping shapes.

### What I Want From You

1. **Prioritized recommendations** — What should be tackled first vs. later?
2. **Concrete suggestions** — Specific refactors, new modules, or patterns to adopt.
3. **Tradeoff analysis** — For major changes (e.g., moving off Sheets, adding TanStack Query), what are the pros/cons and migration effort?
4. **Incremental path** — If I can't do everything at once, what's a sensible order of operations?
5. **What to keep** — What's working well and should be preserved?

Focus on: separation of concerns, maintainability, testability, and scalability (within the constraint of a personal/small-scale app). Assume the app will stay on Google Sheets for the foreseeable future unless you strongly recommend otherwise.

---

## How to Use

1. Open your workout-tracker project in your editor.
2. Copy everything from "You are an expert software architect..." through "...unless you strongly recommend otherwise."
3. Paste into your preferred LLM (Claude, GPT, etc.).
4. Optionally, attach or paste key files (`src/utils/sheets.ts`, `src/utils/log-sets.ts`, `src/routes/_authed/workout.$dayKey.$exerciseKey.tsx`, `src/routes/_authed/charts.tsx`) if the LLM supports file input, for more precise suggestions.
