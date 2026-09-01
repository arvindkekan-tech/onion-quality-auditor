# PAOQA — Portable AI Onion Quality Auditor

Frontend for the SIH 2026 onion quality inspection demo journey.

## Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- React Router
- TanStack Query
- Zustand (capture draft state only)

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend REST API base URL | `http://localhost:8000` |
| `VITE_USE_MOCK_API` | Use mock adapters when `true` | `true` |

Set `VITE_USE_MOCK_API=false` when the backend is ready. Page components do not need to change.

## Milestone 1 routes

- `/` — Dashboard
- `/inspection/new` — New Inspection
- `/inspection/:id/capture` — Image Capture
- `/inspection/:id/quality` — Image Quality Check
- `/inspection/:id/analysis` — AI Analysis (polls backend)
- `/inspection/:id/results` — Inspection Results
- `/inspection/:id/review` — Human Review
- `/certificate/:id` — Digital Certificate
- `/verify/:token` — QR Verification

## Project structure

- `src/features/` — one folder per screen
- `src/lib/api/` — HTTP client + mock/real API functions
- `src/features/*/hooks.ts` — TanStack Query hooks (pages call hooks, not `fetch`)
