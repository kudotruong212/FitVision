# FitVision API Reference

## Auth

| Endpoint | Method | Body | Notes |
| --- | --- | --- | --- |
| `/api/auth/register` | POST | `{ name?, email, password }` | Password must be ≥8 chars w/ upper, lower, digit. Rate limited. |
| `/api/auth/login` | POST | `{ email, password }` | Returns JWT + user info. |

All protected routes require `Authorization: Bearer <token>`.

## Scan & AI

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/scan/quota` | GET | Returns `{ allowed, left, max }` for the authenticated user. |
| `/api/ai/analyze` | POST (multipart) | Upload image file (`image`). Stores on Cloudinary, forwards to FastAPI, enriches with pose confidence, updates quota, logs the event. |
| `/api/plan/generate` | POST | Forwards full body analysis to FitVision AI service to create a GPT-driven workout plan (auto fallback to heuristic template if AI is unavailable). |
| `/api/scan/save` | POST | Persist `{ analysis, plan }` and encrypt raw image URL. |
| `/api/scan/history?limit=20` | GET | Latest scans (per user). Includes `signed_image_url` (short-lived). |
| `/api/history/all` | GET | Full history (per user). |
| `/api/scan/:id` | DELETE | Deletes a scan the user owns, revoking signed URLs and removing the Cloudinary asset. |
| `/api/stats/scan-summary` | GET | Aggregated totals + last 14 days for public dashboards. |
| `/api/media/scan/:id` | GET | Returns signed Cloudinary URL (5-minute TTL) for a scan the user owns. |
| `/api/metrics` | GET | Authenticated metrics: uptime and rolling AI latency averages (for monitoring dashboards). |

### `/api/plan/generate`

- **Method:** `POST`
- **Body:** Either a body-analysis object (same shape returned by `/api/ai/analyze`) or `{ analysis, profile }` where `profile` mirrors the fields from `/api/profile/me` (goal, experience, preferred modalities, injuries, etc.).
- **Response:** GPT-generated plan with keys: `level`, `sessions_per_week`, `focus_areas`, `sessions` (each session may contain `title`, `focus`, `blocks`, `exercises`, `notes`).
- **Fallbacks:** If the AI microservice is unreachable, the endpoint automatically returns a deterministic backup plan derived from the analysis; the payload includes `source: "fallback"` so clients can display a notice.
- **Errors:** `500` when neither AI nor fallback logic can produce a plan.

## Profile

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/profile/me` | GET | Returns the authenticated user's training profile (goal, experience level, modalities, injuries, equipment, body metrics). |
| `/api/profile/me` | PUT | Updates the profile. Arrays accept either JSON arrays or comma-separated strings. |

Profile data is automatically injected into workout-plan generation and AI Coach prompts.

## Reports

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/reports/weekly` | GET | Authenticated users download a CSV covering their latest scans (date, score, delta, weak muscles, fat area, risk, pose symmetry). |

## Coach & Exercises

| Endpoint | Method | Notes |
| --- | --- | --- |
| `/api/coach/context` | GET | Latest scan and plan for the user (auth required). |
| `/api/coach/chat` | POST | Sends `{ user_message, context? }` to FastAPI coach endpoint. |
| `/api/coach/thread` | GET | Returns the last 20 chat messages for the authenticated user. |
| `/api/coach/thread` | DELETE | Clears stored chat history for the authenticated user. |
| `/api/exercises` | GET | Optional query `muscle`, `level`. |
| `/api/exercises/:slug` | GET | Exercise details. |

## Error Codes

- `401 Unauthorized` – missing/invalid token.
- `429 Too Many Requests` – login/register rate limit or scan quota reached.
- `500` – downstream service failure (Cloudinary, OpenAI, Mongo).

## Security Notes

- Cloudinary URLs are stored encrypted (`DATA_ENCRYPTION_KEY`).
- Signed download endpoint ensures short-lived access.
- Mongo documents track per-user quota (`scanQuota` field).



