# AI-Generated Online Exam Portal - Architecture Design

## Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Admin Dashboard](#admin-dashboard)
6. [Exam Platform (Participant UI)](#exam-platform)
7. [AI Question Generation System](#ai-question-generation)
8. [Real-Time Exam Engine](#real-time-exam-engine)
9. [Analytics & Reporting](#analytics--reporting)
10. [API Architecture](#api-architecture)
11. [Deployment & Infrastructure](#deployment--infrastructure)
12. [Implementation Phases](#implementation-phases)

---

## Overview

A serverless, AI-powered online exam platform for government exam preparation (IBPS, SSC CGL, SBI PO). Two main interfaces:

1. **Admin Dashboard** - Schedule exams, manage questions, track analytics, monitor live exams
2. **Exam Platform** - Participants login, view scheduled exams, take exams, view results

### Key Requirements
- Dynamic AI-generated questions (different per participant, same difficulty)
- PYQ (Previous Year Questions) integration from IBPS, SSC, SBI sources
- Per-question time tracking with detailed analytics
- Real-time exam monitoring for admins
- Serverless deployment on Vercel
- Background jobs via Trigger.dev

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15 (App Router) | Vercel-native, RSC, route groups for admin/exam separation |
| **Language** | TypeScript | Type safety across client/server |
| **Database** | PostgreSQL via Neon | Serverless driver, scale-to-zero, DB branching, $0 at small scale |
| **ORM** | Drizzle ORM | No cold-start penalty (unlike Prisma), thin SQL layer, Neon serverless driver support |
| **Auth** | Clerk | Built-in RBAC (admin/participant), invitation flows, middleware integration |
| **Real-time** | Ably | Guaranteed message delivery, presence API for live monitoring |
| **UI** | shadcn/ui + Tailwind CSS v4 | Copy-paste components, full customization, accessible |
| **State** | TanStack Query + Zustand | Server state caching + client exam state |
| **Charts** | Recharts | React-native, shadcn integration, all chart types needed |
| **Background Jobs** | Trigger.dev v3 | No infrastructure, 300s execution, Vercel-compatible |
| **Email** | Resend + React Email | React templates, Vercel-native, 3K emails/mo free |
| **AI** | Vercel AI SDK + OpenRouter | Unified interface, multi-model routing, streaming |
| **Validation** | Zod | Single source of truth for client/server validation |
| **Forms** | React Hook Form | Dynamic field arrays for complex exam creation |
| **Storage** | Vercel Blob | Zero-config, CDN-cached for question images |
| **Cache** | Vercel KV (Upstash Redis) | Rate limiting, session state, timer data |

### Dependencies Summary
```
# Core
next@15.x, react@19.x, typescript@5.x

# Database
@neondatabase/serverless, drizzle-orm, drizzle-kit

# Auth
@clerk/nextjs

# UI
tailwindcss@4.x, @radix-ui/*, class-variance-authority, clsx, tailwind-merge, lucide-react, next-themes

# State & Data
@tanstack/react-query, zustand

# Charts
recharts

# Background Jobs
@trigger.dev/sdk@3.x

# Email
resend, @react-email/components

# AI
ai (Vercel AI SDK), @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google

# Forms & Validation
zod, react-hook-form, @hookform/resolvers

# Real-time
ably

# Storage & Cache
@vercel/blob, @vercel/kv, @upstash/ratelimit
```

### Cost Estimate (2-10 users)
| Service | Monthly Cost |
|---------|-------------|
| Vercel (Hobby) | $0 |
| Neon Postgres | $0 |
| Clerk | $0 (10K MAU free) |
| Ably | $0 (6M msg/mo free) |
| Trigger.dev | $0 (500 runs/mo free) |
| Resend | $0 (3K emails/mo free) |
| AI APIs (OpenRouter) | ~$5-15 |
| **Total** | **$5-16/month** |

---

## Project Structure

```
/
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── components.json                 # shadcn/ui config
├── docker-compose.yml              # Local Postgres for dev
├── drizzle.config.ts               # Drizzle Kit config
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── trigger.config.ts               # Trigger.dev config
├── tsconfig.json
├── vercel.json
│
├── drizzle/
│   └── migrations/                 # Auto-generated SQL migrations
│
├── trigger/
│   ├── ai-question-generation.ts   # Generate questions via AI
│   ├── exam-activation.ts          # Activate exam at scheduled time
│   ├── auto-submit.ts              # Force submit on timeout
│   ├── score-calculation.ts        # Grade + score submissions
│   ├── finalize-exam.ts            # Ranks, percentiles, stats
│   ├── send-notifications.ts       # Email dispatch
│   ├── analytics-aggregation.ts    # Pre-compute analytics
│   └── pyq-scraping.ts            # Fetch PYQs from web
│
├── emails/                         # React Email templates
│   ├── exam-invitation.tsx
│   ├── exam-reminder.tsx
│   └── results-notification.tsx
│
└── src/
    ├── middleware.ts               # Edge: auth guards, role routing, rate limiting
    │
    ├── app/
    │   ├── layout.tsx              # Root layout (providers, fonts)
    │   ├── globals.css             # Tailwind directives + CSS vars
    │   ├── not-found.tsx
    │   ├── error.tsx
    │   │
    │   ├── (auth)/                 # Auth route group
    │   │   ├── layout.tsx          # Centered card layout
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   │
    │   ├── (admin)/                # Admin route group
    │   │   ├── layout.tsx          # Sidebar + topbar + Clerk admin guard
    │   │   ├── admin/
    │   │   │   ├── page.tsx                    # Dashboard overview
    │   │   │   ├── exams/
    │   │   │   │   ├── page.tsx                # Exam list
    │   │   │   │   ├── new/page.tsx            # Create exam (multi-step wizard)
    │   │   │   │   ├── [examId]/
    │   │   │   │   │   ├── page.tsx            # Exam detail/edit
    │   │   │   │   │   ├── questions/page.tsx  # Manage questions
    │   │   │   │   │   ├── monitor/page.tsx    # Live monitoring
    │   │   │   │   │   └── results/page.tsx    # Per-exam results
    │   │   │   │   └── _components/
    │   │   │   │       ├── exam-form.tsx
    │   │   │   │       ├── exam-table.tsx
    │   │   │   │       ├── subject-topic-selector.tsx
    │   │   │   │       └── question-editor.tsx
    │   │   │   ├── participants/
    │   │   │   │   ├── page.tsx
    │   │   │   │   └── [userId]/page.tsx
    │   │   │   ├── questions/
    │   │   │   │   └── page.tsx                # Global question bank
    │   │   │   ├── analytics/
    │   │   │   │   ├── page.tsx                # Cross-exam analytics
    │   │   │   │   └── comparison/page.tsx
    │   │   │   └── settings/page.tsx
    │   │   └── _components/
    │   │       ├── admin-sidebar.tsx
    │   │       ├── admin-topbar.tsx
    │   │       └── admin-breadcrumbs.tsx
    │   │
    │   ├── (exam)/                 # Exam platform route group
    │   │   ├── layout.tsx          # Minimal nav + Clerk participant guard
    │   │   ├── dashboard/
    │   │   │   ├── page.tsx        # Upcoming/past exams
    │   │   │   └── _components/
    │   │   │       ├── upcoming-exams.tsx
    │   │   │       └── past-results.tsx
    │   │   ├── exam/[examId]/
    │   │   │   ├── page.tsx        # Exam info + start button
    │   │   │   ├── take/page.tsx   # ACTIVE EXAM INTERFACE
    │   │   │   ├── result/page.tsx # Post-exam results
    │   │   │   └── review/page.tsx # Review with solutions
    │   │   ├── _components/
    │   │   │   ├── exam-timer.tsx
    │   │   │   ├── question-panel.tsx
    │   │   │   ├── question-nav-palette.tsx
    │   │   │   ├── section-tabs.tsx
    │   │   │   ├── answer-options.tsx
    │   │   │   ├── submit-dialog.tsx
    │   │   │   └── solution-panel.tsx
    │   │   └── profile/page.tsx
    │   │
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts
    │       ├── webhooks/trigger/route.ts
    │       ├── time/route.ts               # Edge: clock sync
    │       ├── admin/exams/
    │       │   ├── route.ts                # GET list, POST create
    │       │   └── [examId]/
    │       │       ├── route.ts            # GET, PUT, DELETE
    │       │       ├── schedule/route.ts
    │       │       ├── invite/route.ts
    │       │       ├── clone/route.ts
    │       │       └── questions/
    │       │           ├── route.ts
    │       │           └── generate/route.ts
    │       ├── exam-session/
    │       │   ├── route.ts                # POST start session
    │       │   └── [sessionId]/
    │       │       ├── route.ts            # GET session state
    │       │       ├── questions/route.ts
    │       │       ├── answer/route.ts     # POST save answer (Edge)
    │       │       ├── sync/route.ts       # POST bulk sync
    │       │       ├── submit/route.ts     # POST final submit
    │       │       └── status/route.ts     # PATCH question status
    │       ├── analytics/
    │       │   ├── dashboard/route.ts
    │       │   ├── exams/[examId]/
    │       │   │   ├── route.ts
    │       │   │   ├── statistics/route.ts
    │       │   │   └── export/route.ts
    │       │   └── participants/[userId]/route.ts
    │       └── participant/
    │           ├── exams/route.ts
    │           ├── results/route.ts
    │           └── results/[examId]/
    │               ├── route.ts
    │               └── download/route.ts
    │
    ├── components/
    │   ├── ui/                     # shadcn/ui primitives
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   ├── table.tsx
    │   │   ├── tabs.tsx
    │   │   ├── badge.tsx
    │   │   ├── input.tsx
    │   │   ├── select.tsx
    │   │   ├── radio-group.tsx
    │   │   ├── checkbox.tsx
    │   │   ├── progress.tsx
    │   │   ├── skeleton.tsx
    │   │   ├── form.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── sheet.tsx
    │   │   ├── avatar.tsx
    │   │   ├── scroll-area.tsx
    │   │   ├── toast.tsx
    │   │   └── sonner.tsx
    │   ├── shared/                 # Reusable project components
    │   │   ├── data-table.tsx
    │   │   ├── page-header.tsx
    │   │   ├── stat-card.tsx
    │   │   ├── empty-state.tsx
    │   │   ├── confirm-dialog.tsx
    │   │   ├── search-input.tsx
    │   │   ├── date-picker.tsx
    │   │   └── loading-spinner.tsx
    │   ├── charts/                 # Recharts wrappers
    │   │   ├── score-distribution-chart.tsx
    │   │   ├── performance-trend-chart.tsx
    │   │   ├── topic-radar-chart.tsx
    │   │   ├── time-per-question-chart.tsx
    │   │   └── comparison-chart.tsx
    │   ├── layout/
    │   │   ├── providers.tsx       # All context providers
    │   │   ├── theme-provider.tsx
    │   │   └── query-provider.tsx
    │   └── forms/
    │       ├── form-field.tsx
    │       └── submit-button.tsx
    │
    ├── server/
    │   ├── db.ts                   # Drizzle client singleton + Neon adapter
    │   │
    │   ├── schema/                 # Drizzle schema definitions
    │   │   ├── users.ts
    │   │   ├── exams.ts
    │   │   ├── questions.ts
    │   │   ├── exam-sessions.ts
    │   │   ├── exam-responses.ts
    │   │   ├── results.ts
    │   │   ├── topics.ts
    │   │   ├── analytics.ts
    │   │   ├── enums.ts
    │   │   ├── relations.ts
    │   │   └── index.ts            # Re-exports all schema
    │   │
    │   ├── data-access/            # ONLY place that imports Drizzle
    │   │   ├── exams.ts
    │   │   ├── questions.ts
    │   │   ├── sessions.ts
    │   │   ├── users.ts
    │   │   └── results.ts
    │   │
    │   ├── actions/                # Server Actions
    │   │   ├── exam.actions.ts
    │   │   ├── question.actions.ts
    │   │   ├── session.actions.ts
    │   │   └── user.actions.ts
    │   │
    │   └── services/               # Business logic
    │       ├── ai-gateway.ts       # Multi-provider AI routing + fallback
    │       ├── question-generator.ts
    │       ├── grading.service.ts
    │       ├── exam-lifecycle.ts
    │       └── score-calculator.ts
    │
    ├── lib/
    │   ├── utils.ts                # cn(), formatDate, etc.
    │   ├── constants.ts            # Roles, statuses, subject taxonomy
    │   ├── env.ts                  # t3-env validation
    │   ├── api-client.ts           # Typed fetch wrapper
    │   │
    │   ├── validations/            # Zod schemas (SINGLE SOURCE OF TRUTH)
    │   │   ├── exam.schema.ts
    │   │   ├── question.schema.ts
    │   │   ├── session.schema.ts
    │   │   ├── user.schema.ts
    │   │   └── analytics.schema.ts
    │   │
    │   ├── hooks/                  # Client-only hooks
    │   │   ├── use-exam-timer.ts
    │   │   ├── use-exam-session.ts
    │   │   ├── use-answer-sync.ts
    │   │   ├── use-anti-cheat.ts
    │   │   ├── use-clock-sync.ts
    │   │   ├── use-keyboard-shortcuts.ts
    │   │   ├── use-fullscreen.ts
    │   │   └── use-debounce.ts
    │   │
    │   └── queries/                # TanStack Query definitions
    │       ├── exam.queries.ts
    │       ├── question.queries.ts
    │       └── session.queries.ts
    │
    ├── stores/                     # Zustand stores
    │   └── exam-session.store.ts   # Exam-taking state (answers, nav, timer)
    │
    ├── types/
    │   ├── exam.ts
    │   ├── question.ts
    │   ├── session.ts
    │   ├── user.ts
    │   ├── analytics.ts
    │   └── api.ts                  # Response envelope types
    │
    └── config/
        ├── site.ts                 # Site metadata
        ├── nav.ts                  # Navigation menus
        └── subjects.ts             # Government exam subject taxonomy
```

### Key Architecture Rules
1. **Server Components by default** - Only add `"use client"` for interactivity
2. **Data Access Layer** - Only `src/server/data-access/` imports Drizzle directly
3. **Validation schemas** - Single source of truth in `src/lib/validations/`, shared by client forms and server actions
4. **Environment** - Always use `src/lib/env.ts`, never `process.env` directly
5. **Route groups** - `(admin)` and `(exam)` have independent layouts and auth guards
6. **Co-location** - Page-specific components in `_components/`, shared ones in `src/components/`

---

## Database Schema

### Entity Relationship Overview

```
User (1) ---- (0..1) UserProfile
  |                      |
  |                      +-- (many) TopicPerformance -- Topic
  |
  +-- (many) Exam  [as creator, Admin only]
  |     |
  |     +-- (many) ExamTopicConfig -- Topic
  |     +-- (many) ExamInvitation
  |     +-- (1) ExamStatistics
  |     +-- (many) ExamSession
  |
  +-- (many) ExamInvitation
  +-- (many) ExamSession
  |     |
  |     +-- (many) ExamQuestion -- Question -- Topic
  |           |
  |           +-- (0..1) ExamResponse
  |           +-- (many) QuestionVisit
  |
  +-- (many) ExamResult
              |
              +-- (many) TopicBreakdown
```

### Core Tables

#### Users & Auth
- **User** - id, email, name, role (ADMIN/PARTICIPANT), emailVerified, lastLoginAt
- **UserProfile** - userId, avatarUrl, targetExam, totalExamsAttempted, averageScore, highestScore

#### Topics (Self-referential hierarchy)
- **Topic** - id, name, slug, parentId, description, sortOrder
  - Supports: "Quantitative Aptitude > Percentage > Compound Interest"

#### Exam Management
- **Exam** - id, title, description, createdById, status (DRAFT/SCHEDULED/LIVE/COMPLETED/ARCHIVED), scheduledStartTime, scheduledEndTime, durationMinutes, totalQuestions, marksPerQuestion, negativeMarking, targetDifficulty, useAiGeneration, usePyqBank, showResultInstantly
- **ExamTopicConfig** - examId, topicId, questionCount, difficulty, pyqPercentage
- **ExamInvitation** - examId, userId, email, status, token

#### Question System
- **Question** - id, topicId, source (AI_GENERATED/PYQ), questionText, optionA/B/C/D, correctOption, explanation, difficulty, pyqSource, pyqYear, aiModel, timesUsed, timesCorrect, averageTimeSec, discriminationIndex

#### Exam Sessions & Responses
- **ExamSession** - examId, userId, status (NOT_STARTED/IN_PROGRESS/SUBMITTED/AUTO_SUBMITTED), startedAt, submittedAt, expiresAt, tabSwitchCount
- **ExamQuestion** - sessionId, questionId, sequenceNumber, marksForCorrect, marksForIncorrect
- **ExamResponse** - examQuestionId, selectedOption, status (NOT_VISITED/VISITED/ANSWERED/MARKED_FOR_REVIEW/ANSWERED_AND_MARKED), isCorrect, marksAwarded, totalTimeSec, timeAnalysis (TOO_FAST/OPTIMAL/TOO_SLOW)
- **QuestionVisit** - examQuestionId, visitNumber, enteredAt, leftAt, durationSec, actionTaken

#### Analytics
- **ExamResult** - examId, userId, sessionId, totalScore, percentage, correctCount, incorrectCount, rank, percentile, avgTimePerQuestionSec
- **TopicBreakdown** - resultId, topicName, correctCount, incorrectCount, score, percentage
- **TopicPerformance** - userProfileId, topicId, totalAttempted, totalCorrect, accuracy, strengthLevel
- **ExamStatistics** - examId, totalParticipants, averageScore, medianScore, standardDeviation, scoreDistribution (JSON)

### Key Design Decisions
- **Different questions per participant**: `ExamQuestion` join table between `ExamSession` and `Question`
- **Time tracking**: Two levels - `ExamResponse.totalTimeSec` (aggregate) + `QuestionVisit` (per-visit detail)
- **Question status colors**: Enum maps directly to UI: NOT_VISITED (grey), VISITED (red), ANSWERED (green), MARKED_FOR_REVIEW (purple), ANSWERED_AND_MARKED (blue)
- **Denormalized analytics**: `ExamResult`, `ExamStatistics`, `TopicPerformance` avoid expensive JOINs on dashboard

---

## Admin Dashboard

### Sidebar Navigation
```
MAIN
  Dashboard              /admin
EXAM MANAGEMENT
  All Exams              /admin/exams
  Create Exam            /admin/exams/new
ANALYTICS
  Results & Reports      /admin/analytics
  Cross-Exam Analysis    /admin/analytics/comparison
PEOPLE
  Participants           /admin/participants
CONTENT
  Question Bank          /admin/questions
SYSTEM
  Settings               /admin/settings
```

### Pages

#### 1. Dashboard Home (`/admin`)
- **Stat Cards**: Total Exams, Total Participants, Upcoming Exams, Live Now (with sparkline trends)
- **Recent Exam Performance Cards**: Horizontal scrollable strip
- **Quick Actions**: Schedule Exam, View Results, Import Questions
- **Activity Feed**: Timeline of recent events

#### 2. Exam Management (`/admin/exams`)
- **Exam List**: Filterable table (status tabs, search, date range)
- **Status Badges**: Draft (grey), Scheduled (blue), Live (green+pulse), Completed (indigo)
- **Actions**: View, Edit, Clone, Delete, Monitor

#### 3. Create Exam (`/admin/exams/new`) - 4-Step Wizard
- **Step 1 - Basic Info**: Name, description, target exam type, date/time, duration
- **Step 2 - Content**: Subject/topic selector (hierarchical), question count, difficulty, source (AI/PYQ/mixed)
- **Step 3 - Scoring**: Marks per correct, negative marking, result visibility
- **Step 4 - Participants**: Email list (paste/CSV upload), invitation preview

#### 4. Live Monitoring (`/admin/exams/[examId]/monitor`)
- Dark-themed dashboard with real-time updates via Ably
- **Live Stats Bar**: Online count, Submitted, In Progress, Avg Progress
- **Participant Grid**: Per-participant cards showing progress, current question, status
- **Charts**: Progress distribution histogram, submission timeline scatter

#### 5. Results & Analytics (`/admin/exams/[examId]/results`)
- **Rankings Tab**: Sortable results table with score, rank, time, correct/wrong
- **Topic Analysis Tab**: Grouped bar chart (per-topic avg vs max), difficulty heatmap
- **Question Analysis Tab**: Per-question accuracy%, avg time, discrimination index

#### 6. Per-Participant Analysis
- **Radar Chart**: Topic performance vs exam average
- **Time Per Question Bar Chart**: Color-coded (green=normal, yellow=fast, red=slow)
- **Question Review Accordion**: Each question with user's answer, correct answer, explanation

#### 7. Cross-Exam Comparison (`/admin/analytics`)
- **Performance Trend**: Line chart (score % over time, multiple participants)
- **Topic Improvement**: Per-topic accuracy trend across exams
- **Participant Comparison**: Grouped bar charts, ranking movement table

### Charts Summary
| Chart | Type | Library | Location |
|-------|------|---------|----------|
| Score Distribution | Histogram Bar | `<BarChart>` | Per-exam results |
| Performance Trend | Multi-line | `<LineChart>` | Cross-exam, participant profile |
| Topic Performance | Radar/Spider | `<RadarChart>` | Participant detail, cross-exam |
| Time per Question | Colored Bar | `<BarChart>` | Participant detail |
| Question Accuracy | Pie | `<PieChart>` | Per-question expandable |
| Progress Distribution | Horizontal Bar | `<BarChart>` | Live monitoring |
| Topic Comparison | Grouped Bar | `<BarChart>` | Cross-exam comparison |
| Participation Trend | Area | `<AreaChart>` | Cross-exam trends |

---

## Exam Platform

### Screens

#### 1. Participant Dashboard (`/dashboard`)
- **Upcoming Exams**: Cards with exam name, date/time, topics, duration, marking scheme
- **Start Exam Button States**: Disabled (>5min before) -> Pulsing (5min window) -> Active (at time) -> Expired
- **Past Exams**: Table with score, status (Passed/Failed), view results link

#### 2. Exam Interface (`/exam/[examId]/take`) - THE CRITICAL SCREEN

```
+====================================================================+
| [Exam Name]                           Timer: 00:45:23  [User Name] |
+====================================================================+
| Section: [Quant] [Reasoning] [English] [GK]                        |
+============================+=======================================+
|                            |  NAVIGATION PALETTE                   |
|  Q. 14 of 25               |                                       |
|  [Question text...]        |  Legend:                               |
|                            |  [grey]   Not Visited                  |
|  (A) O  Option 1           |  [red]    Not Answered                 |
|  (B) O  Option 2           |  [green]  Answered                     |
|  (C) O  Option 3           |  [purple] Marked for Review            |
|  (D) O  Option 4           |  [blue]   Answered & Marked            |
|                            |                                       |
|  [ ] Mark for Review       |  [Grid of numbered buttons 1-25]      |
|  [Clear Response]          |                                       |
|                            |  Answered: 8 | Not Answered: 3        |
| [<< Previous] [Save & Next >>] | Not Visited: 12 | Marked: 2     |
+============================+=======================================+
| [Question Paper] [Instructions]                [Submit Exam]       |
+====================================================================+
```

**Timer Behavior**:
- Monospace font, prominent display
- Color changes: White (>10min) -> Amber (5-10min) -> Red+pulse (<5min) -> Blink (<1min)
- Server-authoritative: syncs every 60s, auto-submits at 0

**Question Navigation Colors**:
| Status | Background | When |
|--------|-----------|------|
| NOT_VISITED | `#e5e7eb` grey | Haven't seen it |
| NOT_ANSWERED | `#fecaca` red | Visited but no answer |
| ANSWERED | `#bbf7d0` green | Answer selected |
| MARKED_FOR_REVIEW | `#e9d5ff` purple | Flagged, no answer |
| ANSWERED+MARKED | `#bfdbfe` blue | Flagged with answer |

**Keyboard Shortcuts**:
| Key | Action |
|-----|--------|
| A/1, B/2, C/3, D/4 | Select option |
| Right/Enter | Save & Next |
| Left | Previous |
| M | Toggle Mark for Review |
| X | Clear Response |

**Anti-Cheat**:
- Tab switch detection (logs event, warning after 3, auto-submit after 5)
- Copy/paste/right-click prevention
- Fullscreen enforcement
- User-select: none on question text

**Offline Resilience**:
- Zustand + localStorage persist all answers
- On reconnect: reconcile with server
- Timer continues from pre-computed serverTimeOffset

#### 3. Post-Exam Screen (`/exam/[examId]/result`)
- Score card with circular progress chart
- Topic-wise breakdown table
- Time analysis (avg time, fastest/slowest questions)
- Download question paper with solutions (PDF)

#### 4. Review Mode (`/exam/[examId]/review`)
- Same layout as exam but read-only
- Shows correct answer (green checkmark) and user's wrong answer (red X)
- Solution/explanation panel below each question
- Navigation palette shows correct (green) / wrong (red) / unattempted (grey)

---

## AI Question Generation

### Architecture

```
Admin schedules exam with topics/difficulty
        |
        v
Trigger.dev job: ai-question-generation
        |
        v
Question Pool Manager (check cache/PYQ bank first)
        |
   +----+----+
   |         |
PYQ Bank   AI Generation Engine
   |         |
   |    OpenRouter -> OpenAI -> Gemini (fallback chain)
   |         |
   +----+----+
        |
Quality Control Gate (validate, dedup, difficulty check)
        |
        v
Store in Question table, link to ExamSession
```

### Model Selection Strategy
| Task | Primary Model | Fallback | Reason |
|------|--------------|----------|--------|
| Math/Quant questions | Claude Opus / GPT-4o | Gemini Pro | Best at following complex rubrics |
| Reasoning questions | GPT-4o | Claude Sonnet | Strong logical reasoning |
| English questions | Claude Sonnet | GPT-4o-mini | Good language understanding, cost-effective |
| General Knowledge | Gemini Flash | GPT-4o-mini | Cheapest for factual content |
| Solution generation | Claude Sonnet | GPT-4o-mini | Clear explanations |

### Question JSON Schema
```typescript
{
  questionText: string,
  options: [
    { label: "A", text: string },
    { label: "B", text: string },
    { label: "C", text: string },
    { label: "D", text: string }
  ],
  correctOption: "A" | "B" | "C" | "D",
  explanation: string,
  topic: string,
  subtopic: string,
  difficulty: "easy" | "medium" | "hard",
  source: "ai_generated",
  metadata: {
    model: string,
    promptVersion: string,
    generatedAt: string
  }
}
```

### Generation Strategy
1. **Pre-generation**: When exam is scheduled, trigger batch generation job
2. **Pool approach**: Generate 2x needed questions, randomly select from pool per participant
3. **PYQ ratio**: Configurable per exam topic (default 50% PYQ / 50% AI)
4. **Caching**: Generated questions stored in Question table for reuse
5. **Quality control**: Validate no duplicate options, answer exists in options, run secondary AI check for ambiguity

### Government Exam Topics (Subject Taxonomy)
```
Quantitative Aptitude
  ├── Percentage, Profit & Loss, SI/CI
  ├── Time & Work, Time Speed & Distance
  ├── Number Series, Data Interpretation
  ├── Ratio & Proportion, Average, Mensuration
  └── P&C, Probability, Quadratic Equations

Reasoning Ability
  ├── Coding-Decoding, Syllogism, Blood Relations
  ├── Direction Sense, Seating Arrangement, Puzzle
  ├── Inequality, Series, Analogy, Classification
  └── Input-Output, Order & Ranking, Data Sufficiency

English Language
  ├── Reading Comprehension, Cloze Test
  ├── Error Spotting, Sentence Improvement
  └── Para Jumbles, Fill in Blanks, Vocabulary

General/Financial Awareness
  ├── Current Affairs, Banking Awareness
  └── Static GK, Financial Awareness

Computer Knowledge
  ├── Fundamentals, Networking, Database
  └── MS Office, Cyber Security
```

---

## Real-Time Exam Engine

### Session Lifecycle

```
ADMIN SCHEDULES EXAM
  |
  v
[exam: status=scheduled]
[Trigger.dev: schedule activation at start time]
  |
TRIGGER.DEV ACTIVATION
  |
  +-> exam.status = active
  +-> Generate question sets per participant (Fisher-Yates shuffle, same difficulty distribution)
  +-> Create exam_sessions (status=assigned)
  +-> Publish "exam-started" via Ably
  |
PARTICIPANT CLICKS START
  |
  v
POST /api/exam-session (join)
  +-> session.startedAt = NOW()
  +-> session.expiresAt = NOW() + duration + grace_period
  +-> Cache in Vercel KV: session:{id}:expires
  +-> Schedule Trigger.dev auto-submit at expiresAt
  +-> Return { serverTime, expiresAt, questions }
  |
EXAM IN PROGRESS
  |
  [Answer change] -> Zustand (instant) -> localStorage -> Debounce 2s -> PATCH /api/.../answer
  [Every 30s]     -> POST /api/.../sync (bulk sync all dirty answers + times)
  [Every 60s]     -> GET /api/time (clock drift correction)
  [Page refresh]  -> Rehydrate from localStorage -> Reconcile with server
  |
EXAM ENDS
  |
  PATH A: Manual Submit          PATH B: Timer Expires
  POST /api/.../submit           Client auto-submit -> same API
  |                              Trigger.dev failsafe at expiresAt
  +-> Upsert final answers
  +-> session.status = submitted/auto_submitted
  +-> Cancel auto-submit Trigger.dev job
  +-> Enqueue scoring Trigger.dev job
  +-> Return confirmation
```

### Timer System
- **Server-authoritative**: Client computes `serverTimeOffset = clientTime - serverTime` on join
- **Display**: `remaining = expiresAt - (Date.now() - offset)`
- **Drift correction**: Re-sync every 60s using exponential moving average
- **Dual auto-submit**: Client-side (fast path) + Trigger.dev server-side (failsafe)

### Answer Persistence (Defense in Depth)
| Layer | Mechanism | Survives |
|-------|-----------|----------|
| L1: Memory | Zustand store | Tab switch |
| L2: Browser | localStorage persist | Page refresh |
| L3: Network | Debounced PATCH per answer | Normal usage |
| L4: Periodic | Full sync every 30s | Network hiccups |
| L5: Submit | Complete payload on final submit | Everything |
| L6: Server | Trigger.dev auto-submit from DB | Client crash |

### Scoring Pipeline (Trigger.dev)
1. **score-calculation** job: Load answers + correct answers, calculate with negative marking, generate topic breakdown, write ExamResult
2. **finalize-exam** job (after all submit): Calculate percentiles, ranks, exam statistics, set exam.status=completed, notify via email

---

## Analytics & Reporting

### Pre-computed vs On-the-fly
| Metric | Strategy |
|--------|----------|
| Exam avg/median/std dev | Pre-computed in ExamStatistics |
| Score distribution histogram | Pre-computed as JSON |
| Question-wise accuracy | Pre-computed in QuestionAnalytics |
| Per-user score trend | On-the-fly (small result set, indexed) |
| Percentile/rank | Pre-computed per exam |
| Cross-exam comparison | On-the-fly from pre-computed snapshots |
| Time heatmap | On-the-fly from QuestionVisit |

### Aggregation Pipeline
```
Exam Submission
  |
  v
Trigger.dev: "score-calculation"
  +-> Score, topic breakdown, time analysis
  +-> Write ExamResult + TopicBreakdown
  |
  v
Trigger.dev: "finalize-exam" (after all done / scheduled)
  +-> Percentiles, ranks
  +-> ExamStatistics (avg, median, std dev, distribution)
  +-> QuestionAnalytics (per-question difficulty, discrimination)
  +-> Update TopicPerformance (per-user long-term)
  +-> Invalidate cache
```

### Exports
- **CSV**: json2csv, streamed from API route
- **PDF**: React-PDF or Puppeteer, generated in Trigger.dev background job
- **Email**: Individual results + PDF attachment via Resend

---

## API Architecture

### Middleware Chain
```
Request -> Rate Limit (Upstash) -> Auth (Clerk JWT) -> Role Check -> Zod Validation -> Handler -> Error Catch
```

### Response Format
```typescript
// Success
{ success: true, data: {...}, meta?: { page, pageSize, totalCount } }

// Error
{ success: false, error: { code: "EXAM_NOT_FOUND", message: "...", details?: {...} } }
```

### Rate Limits
| Endpoint | Limit | Per |
|----------|-------|-----|
| Auth endpoints | 10/min | IP |
| AI generation | 5/min | userId |
| Answer submission | 120/min | sessionId |
| General API | 60/min | userId |
| Export | 5/min | userId |

### Edge vs Serverless
| Edge (fastest) | Serverless (full Node.js) |
|----------------|--------------------------|
| Clock sync `/api/time` | Exam CRUD |
| Session state read | AI generation trigger |
| Answer save (KV write) | Score calculation |
| Question status update | Analytics queries |
| Auth session check | CSV/PDF export |

---

## Deployment & Infrastructure

### Vercel Configuration
```jsonc
// vercel.json
{
  "framework": "nextjs",
  "regions": ["bom1"],           // Mumbai for Indian users
  "functions": {
    "src/app/api/admin/exams/*/questions/generate/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 2 * * *" },
    { "path": "/api/cron/analytics", "schedule": "0 */6 * * *" }
  ]
}
```

### Environment Variables
```bash
# Database (Neon)
DATABASE_URL="postgresql://..."
DIRECT_DATABASE_URL="postgresql://..."

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# AI
OPENROUTER_API_KEY="sk-or-..."
OPENAI_API_KEY="sk-..."
GOOGLE_AI_API_KEY="AI..."
ANTHROPIC_API_KEY="sk-ant-..."

# Background Jobs
TRIGGER_SECRET_KEY="tr_dev_..."

# Email
RESEND_API_KEY="re_..."

# Real-time
ABLY_API_KEY="..."

# Cache
KV_REST_API_URL="..."
KV_REST_API_TOKEN="..."

# App
NEXT_PUBLIC_APP_URL="https://..."
```

### CI/CD
```
Push to branch -> GitHub Actions (lint, typecheck, test)
                -> Vercel Preview Deploy (auto, with Neon DB branch)
                -> Trigger.dev deploy (on main merge)

Merge to main  -> Vercel Production Deploy
                -> drizzle-kit migrate (in build command)
```

### Build Command
```
drizzle-kit migrate && next build
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Initialize Next.js 15 + TypeScript + Tailwind + shadcn/ui
- [ ] Set up Drizzle ORM + Neon Postgres + schema + migrations + seed
- [ ] Configure Clerk auth with admin/participant roles
- [ ] Build admin layout (sidebar, topbar, breadcrumbs)
- [ ] Build exam platform layout (minimal nav)
- [ ] Set up environment validation (t3-env)
- [ ] Deploy to Vercel

### Phase 2: Exam Management (Week 3-4)
- [ ] Exam CRUD API routes + server actions
- [ ] Exam list page with data table, filters, status badges
- [ ] Multi-step exam creation wizard with subject/topic selector
- [ ] Exam detail/edit page
- [ ] Participant invitation flow + email via Resend
- [ ] Question CRUD (manual entry)

### Phase 3: AI Integration (Week 5-6)
- [ ] AI gateway service (OpenRouter + fallbacks)
- [ ] Question generation Trigger.dev job with prompt templates
- [ ] Question bank management page
- [ ] PYQ import functionality
- [ ] Quality control validation

### Phase 4: Exam Engine (Week 7-8)
- [ ] Exam session lifecycle (start, answer, submit)
- [ ] Server-authoritative timer with clock sync
- [ ] Answer persistence (Zustand + localStorage + API sync)
- [ ] Question navigation palette with color coding
- [ ] Auto-submit (client + Trigger.dev failsafe)
- [ ] Anti-cheat measures
- [ ] Offline resilience

### Phase 5: Scoring & Results (Week 9)
- [ ] Score calculation Trigger.dev job
- [ ] Exam finalization (ranks, percentiles, statistics)
- [ ] Post-exam results page
- [ ] Review mode with solutions
- [ ] PDF download (question paper + solutions)

### Phase 6: Analytics Dashboard (Week 10-11)
- [ ] Per-exam analytics (score distribution, question analysis, topic breakdown)
- [ ] Per-participant analytics (radar chart, time analysis, trend graph)
- [ ] Cross-exam comparison
- [ ] Live exam monitoring with Ably
- [ ] CSV/PDF export
- [ ] Email reports

### Phase 7: Polish (Week 12)
- [ ] Loading skeletons, error boundaries, empty states
- [ ] Responsive design (tablet/mobile)
- [ ] Keyboard shortcuts
- [ ] Performance optimization
- [ ] Security audit
- [ ] End-to-end testing
