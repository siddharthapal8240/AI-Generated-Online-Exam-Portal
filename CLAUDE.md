# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev                # Next.js dev server with Turbopack
npm run build              # Production build (runs db:migrate first)
npm run start              # Production server

# Code quality
npm run typecheck          # tsc --noEmit
npm run lint               # next lint
npm run lint:fix           # next lint --fix
npm run format             # prettier --write .
npm run format:check       # prettier --check .
npm run check              # typecheck + lint combined

# Database (Drizzle + Neon PostgreSQL)
npm run db:generate        # Generate migrations after schema changes
npm run db:push            # Push schema directly to dev database
npm run db:migrate         # Run migrations (used in CI/build)
npm run db:studio          # Visual database browser
npm run db:seed            # Seed with test data (tsx drizzle/seed.ts)

# Background jobs
npm run trigger:dev        # Trigger.dev local development
```

## Architecture

Next.js 16 App Router with React 19, TypeScript, Tailwind CSS 4, and Drizzle ORM on Neon PostgreSQL.

### Route Groups

- `(auth)` — Public auth pages (Clerk login/register)
- `(exam)` — Participant-facing exam platform (dashboard, take exam, results, review)
- `(admin)` — Admin dashboard (exam management, analytics, participants)

### Server-Side Layers

Strict layering — each layer only calls the one below it:

```
Server Actions / API Routes  →  src/server/actions/
        ↓
Services (business logic)    →  src/server/services/
        ↓
Data Access (queries only)   →  src/server/data-access/  (ONLY place that imports Drizzle)
        ↓
Drizzle ORM                  →  src/server/db.ts
```

**Only `src/server/data-access/` may import Drizzle directly.** All database queries go through this layer.

### Key Services

- `ai-gateway.ts` — Multi-provider AI routing (Anthropic/OpenAI/Google) with fallback chains
- `question-generator.ts` — AI question generation with government exam prompt templates
- `score-calculator.ts` — Scoring with negative marking and time analysis
- `exam-question-manager.ts` — Question assignment with Fisher-Yates shuffle

### Client-Side Patterns

- **State**: Zustand store (`src/stores/exam-session.store.ts`) for exam session; TanStack React Query for server state
- **Forms**: React Hook Form + Zod resolvers
- **Validation schemas** in `src/lib/validations/` are the single source of truth, shared by client forms and server actions
- **Environment variables** accessed only through `src/lib/env.ts` (Zod-validated, t3-env pattern)
- **Constants/enums** in `src/lib/constants.ts` (roles, exam statuses, difficulty levels, timing thresholds)

### Components

- `src/components/ui/` — shadcn/ui primitives (Base Nova style)
- `src/components/shared/` — Reusable project components (data table, page header, stat card)
- `src/components/charts/` — Recharts wrappers
- Page-specific components live in `_components/` directories co-located with their page

### Middleware

`src/middleware.ts` handles Clerk auth guards and admin role checks (admin identified by email whitelist).

### API Routes

- `/api/time` — Edge function for server time sync (exam timer accuracy)
- `/api/exam-session` — Session lifecycle (start, answer, sync, submit)
- `/api/exams/[examId]/generate` — AI question generation (60s timeout on Vercel)
- `/api/topics` — Topic taxonomy

## Database Schema

Schema definitions in `src/server/schema/` with these main entity groups:
- Users & profiles (Clerk-synced)
- Hierarchical topics (government exam subject taxonomy with parentId)
- Exams with topic configs and invitations
- Questions (AI_GENERATED, PYQ, or MANUAL sources)
- Exam sessions, responses, and per-question visit tracking
- Results and analytics (topic breakdowns, performance tracking, exam statistics)

Migrations in `drizzle/migrations/`. Config in `drizzle.config.ts`.

## Deployment

Vercel serverless, Mumbai region (`bom1`). AI generation endpoints have 60s function timeout; session endpoints have 30s. Build command runs `drizzle-kit migrate && next build`.

## Style

- Prettier: double quotes, semicolons, 2-space indent, 100 char width, trailing commas
- Server Components by default; add `"use client"` only when needed for interactivity
- Icons from Lucide React
