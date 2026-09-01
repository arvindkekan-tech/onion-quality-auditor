# ONIVIS — AI-Assisted Onion Quality Inspection

Frontend for the SIH 2026 onion quality inspection demo journey.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui
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

## Routes

### Main navigation
- `/` — Dashboard
- `/inspections` — Inspection history
- `/inspection/new` — New Inspection
- `/analytics` — Analytics
- `/profile` — Profile & settings

### Inspection journey
- `/inspection/:id/capture` — Image Capture
- `/inspection/:id/quality` — Image Quality Check
- `/inspection/:id/analysis` — AI Analysis (polls backend)
- `/inspection/:id/results` — Inspection Results
- `/inspection/:id/review` — Human Review
- `/certificate/:id` — Digital Certificate
- `/verify/:token` — QR Verification

## Project structure

- `src/features/` — one folder per screen
- `src/components/shared/` — reusable UI components
- `src/lib/api/` — HTTP client + mock/real API functions
- `src/lib/demo-data.ts` — demo metrics and sample data
