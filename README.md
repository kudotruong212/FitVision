# FitVision

AI-assisted Gym & Yoga companion that analyzes posture photos, generates workout plans, tracks progress, and offers an AI coach chat experience.

## Monorepo Layout

| Path | Description |
| --- | --- |
| `fitvision-frontend/` | Vite + React SPA |
| `fitvision-backend/` | Express API, MongoDB integration, AI orchestration |
| `fitvision-ai/` | FastAPI microservice calling OpenAI Vision + MediaPipe |

## Quick Start (Dev)

1. **Environment variables**

   Create `.env` files for backend and AI service:

   ```bash
   # fitvision-backend/.env
   MONGODB_URI=mongodb://localhost:27017/fitvision
   AI_SERVICE_URL=http://localhost:8001
   JWT_SECRET=change-this
   DATA_ENCRYPTION_KEY=secure-32-char-key
   SCAN_QUOTA_PER_DAY=20
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   OPENAI_API_KEY=...
   ```

   ```bash
   # fitvision-ai/.env
   OPENAI_API_KEY=...
   ```

2. **Install packages**

   ```bash
   cd fitvision-frontend && npm install
   cd ../fitvision-backend && npm install
   cd ../fitvision-ai && python -m venv venv && venv/Scripts/activate && pip install -r requirements.txt
   ```

3. **Run services**

   - Start MongoDB locally.
   - `cd fitvision-ai && uvicorn main:app --reload --port 8001`
   - `cd fitvision-backend && npm start`
   - `cd fitvision-frontend && npm run dev`

4. **Frontend config**

   Frontend reads `VITE_API_BASE_URL`. Set when running under Docker or keep default (`http://localhost:5000`).

## Testing

| Area | Command |
| --- | --- |
| Frontend (Vitest + Testing Library) | `cd fitvision-frontend && npm run test` |
| Backend (Jest + Supertest + mongodb-memory-server) | `cd fitvision-backend && npm test` |

Vitest coverage reports are emitted to `coverage/`. Backend Jest tests mock Cloudinary & OpenAI interactions and spin up an in-memory Mongo.

## Docker & Compose

Build and run the full stack:

```bash
docker compose up --build
```

Services:

- `frontend` on `http://localhost:4173`
- `backend` API on `http://localhost:5000`
- `ai-service` (FastAPI) on `http://localhost:8001`
- `mongo` (port 27017)

Provide secrets via environment or `.env` file read by Compose (see `docker-compose.yml` for required vars).

## Continuous Integration

`.github/workflows/ci.yml` runs lint/tests for frontend and backend on every push, ensuring:

- Frontend builds and Vitest suite succeeds.
- Backend Jest suite passes with mocked external services.

## Documentation

- `docs/API.md` – REST endpoints, auth requirements, signed media notes.
- In-product tooltips + BodyScan onboarding guide.

Feel free to extend docs with deployment notes (K8s, secrets management, etc.).







