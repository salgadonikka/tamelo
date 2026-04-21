# Tamelo — Frontend

The React frontend for **Tamelo**, *The Procrastinator's To Do List* — a weekly task planner that uses circular day markers to track planned, in-progress, and completed work across a rolling calendar view.

## Tech Stack

| Concern | Library / Tool |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build tool | Vite 5 |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix UI primitives) |
| Routing | React Router v6 |
| Auth | Supabase Auth (email/password + Google OAuth) |
| API client | Custom fetch wrapper → [Tamelo.Api](https://github.com/salgadonikka/tamelo-api) |
| Drag and drop | @dnd-kit/core + @dnd-kit/sortable |
| Date handling | date-fns v4 |
| Testing | Vitest + Testing Library |

## Prerequisites

- **Node.js** 20 or later
- A running instance of [Tamelo.Api](https://github.com/salgadonikka/tamelo-api)
- A **Supabase project** for authentication — used only for auth (sign-in, JWTs); the database is owned by Tamelo.Api and is not on Supabase

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_API_URL="https://localhost:5001"
```

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard → Settings → API → Project API keys (publishable) |
| `VITE_API_URL` | Base URL of the running Tamelo.Api instance |

> **Note:** `VITE_API_URL` must use **HTTPS** (e.g. `https://localhost:5001`). Pointing to the HTTP port causes CORS preflight failures because the API's redirect middleware blocks `OPTIONS` requests.

### 3. Trust the local dev certificate (first time only)

```bash
# From the Tamelo.Api project directory
dotnet dev-certs https --trust
```

### 4. Start the dev server

```bash
npm run dev
```

The app runs on `http://localhost:8080`.

## Scripts

```bash
npm run dev          # Dev server on port 8080 with hot reload
npm run build        # Production build to dist/
npm run preview      # Serve the production build locally
npm run lint         # ESLint (flat config, ESLint 9)
npm test             # Run tests once (Vitest)
npm run test:watch   # Tests in watch mode
```

## Project Structure

```
src/
├── components/
│   ├── ui/               # shadcn/ui base components (auto-generated)
│   ├── KanbanBoard.tsx   # Kanban view container
│   ├── KanbanColumn.tsx  # Individual Kanban column
│   ├── KanbanCard.tsx    # Draggable task card
│   ├── TaskList.tsx      # Weekly task list view
│   ├── TaskRow.tsx       # Single task row with circular day markers
│   ├── TaskDetail.tsx    # Task detail panel (notes, history)
│   ├── TaskInput.tsx     # New task input bar
│   ├── WeekHeader.tsx    # Rolling weekly calendar header
│   └── ProjectPanel.tsx  # Project sidebar
├── hooks/
│   ├── useAuth.tsx           # Auth context — Supabase sign-in/sign-up/sign-out
│   ├── useTaskStore.ts       # Central state for tasks, projects, and markers
│   ├── useTaskNotes.ts       # Task notes CRUD
│   └── useTaskHistory.ts     # Task activity history
├── lib/
│   └── apiClient.ts      # Fetch wrapper — reads Supabase JWT, calls Tamelo.Api
├── pages/
│   ├── Index.tsx         # Main task list + project sidebar
│   ├── ProjectView.tsx   # Project detail page + Kanban board
│   ├── Login.tsx
│   ├── Signup.tsx
│   └── Settings.tsx
├── integrations/
│   └── supabase/
│       └── client.ts     # Supabase JS client (used for auth only)
└── types/
    └── task.ts           # Core types: Task, Project, DayMarker, CircleState
```

## Architecture

### Authentication

Sign-in, sign-up, and session management are handled entirely by **Supabase Auth**. After a user authenticates, Supabase issues a JWT. Every request to Tamelo.Api attaches this JWT as `Authorization: Bearer <token>`. The API validates the token via OIDC/JWKS — no credentials are stored in the frontend beyond what Supabase manages.

```
User signs in → Supabase Auth → JWT stored in localStorage
                                     │
                              apiClient.ts reads JWT
                              on every fetch request
                                     │
                              Tamelo.Api validates JWT
                              and resolves user identity
```

### State Management

`useTaskStore.ts` is a custom hook that holds all task and project state using React `useState`. It is instantiated once at the top level (`Index.tsx`) and all state and mutations are passed down as props. There is no global state library (Zustand, Redux, etc.).

### Data Flow

All data reads and writes go through **Tamelo.Api** — there are no direct Supabase database calls. The three data hooks (`useTaskStore`, `useTaskNotes`, `useTaskHistory`) call `apiClient` methods and update local React state on success.

### ID Types

The API uses integer primary keys. The frontend `Task` and `Project` types use `string` IDs. Conversion happens at the API boundary in each hook's mapping function:

```typescript
// API int → frontend string
mapTask(dto) { return { id: dto.id.toString(), ... } }

// frontend string → API int
api.put(`/api/Tasks/${parseInt(taskId, 10)}`, body)
```

### Routes

All routes except `/login` and `/signup` are guarded by `ProtectedRoute`, which redirects unauthenticated users to `/login`.

| Route | Page |
|---|---|
| `/` | Weekly task list (main view) |
| `/project/:projectId` | Project detail + Kanban board |
| `/settings` | User settings |
| `/help` | Help |
| `/login` | Login |
| `/signup` | Sign up |

## Core Concepts

### Day Markers (CircleState)

Each task can have markers on specific calendar dates. The circular marker on a day cell cycles through states on click:

| State | Meaning |
|---|---|
| `empty` | No marker (default) |
| `planned` | Task is scheduled for this day |
| `started` | Work is in progress |
| `completed` | Done |

Cycling rules differ by context — future weeks only allow `planned`, past days within the current week skip straight to `started`, and past weeks are locked.

### Kanban Board (Project View)

Each project has a Kanban view at `/project/:projectId` that groups tasks into four columns based on their marker states: **To Be Planned**, **Planned**, **Ongoing**, and **Completed**. Tasks can be dragged between columns or moved via the column action buttons.

## Supabase Setup

Supabase is used **only for authentication**. No tables or PostgREST queries are used — the database is owned by Tamelo.Api.

**Required configuration in Supabase dashboard:**

1. **Authentication → URL Configuration:** Set Site URL to your app's origin (e.g. `http://localhost:8080`)
2. **Authentication → URL Configuration → Redirect URLs:** Add `http://localhost:8080`
3. **Authentication → Providers → Google** (optional): Enable and paste your Google Cloud Console Client ID and Secret. Add `https://<project-ref>.supabase.co/auth/v1/callback` as an Authorized Redirect URI in Google Cloud Console.
