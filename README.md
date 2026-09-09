# BAHAWATCH — MVP

Post-type flood & road condition reporting with camera + geolocation + AI vision.

> **Pivot 2026-09-09:** Mobile Flutter **paused** for production. MVP web is now **mobile-first React + Tailwind** (`/web`) with identical features — runs on phone browsers, no APK gate for pilot.

## Stack
- **Web (MVP):** React 19 + Vite + Tailwind 3 + React Router + Leaflet (OSM) — mobile-first, max-w `640px` phone frame, bottom nav
- **Mobile (paused):** Flutter (camera + geolocator + hive + google_maps) — kept in `/mobile`, not required for demo
- **Backend:** Express + SQLite (node:sqlite WAL) + multer + JWT
- **AI:** Python FastAPI mock (OpenAI `gpt-4o-mini` vision or heuristic fallback)
- **Admin:** React + Vite + Tailwind

## Quick Start

```bash
# Backend
cd server && npm install && npm run dev
# seed admin: POST http://localhost:3000/api/auth/seed-admin -> admin@bahawatch.ph / admin123
# seed demo posts: POST http://localhost:3000/api/seed?demo=1

# AI (optional)
cd ai-service && pip install -r requirements.txt && uvicorn main:app --port 8000
# set OPENAI_API_KEY for real vision

# Web (MVP — mobile-first, use this for pilot)
cd web && npm install --legacy-peer-deps && npm run dev
# set VITE_API_URL=http://localhost:3000 in web/.env
# open http://localhost:5173 — test on phone via ngrok/ LAN IP

# Admin
cd admin && npm install && npm run dev
# set VITE_API_URL=http://localhost:3000

# Mobile (paused — still builds)
cd mobile && flutter pub get && flutter run --dart-define=API_URL=http://10.0.2.2:3000
```

## API
- `GET /api/health`
- `GET /api/posts?bounds=&feed=true`
- `POST /api/posts` (multipart: photo + lat/lng + roadName + roadCondition + severity + caption)
- `POST /api/posts/:id/ai-analyze`
- `PATCH /api/posts/:id/verify|clear|flag`
- `POST /api/auth/login` · `GET /api/admin/posts`

## Web MVP parity with Mobile
| Mobile (Flutter) | Web (React) | Notes |
|---|---|---|
| `FeedScreen` pull-to-refresh + card | `web/src/pages/Feed.jsx:1` same card, freshness, AI badge, status · 30s poll | bottom nav Feed |
| `MapScreen` google_maps + hue pins | `web/src/pages/MapView.jsx:1` Leaflet OSM + divIcon hues + bounds `BETWEEN` query | no Google API key |
| `CaptureScreen` camera + geolocator + EXIF | `web/src/pages/CreatePost.jsx:1` `input capture=environment` + `navigator.geolocation` + EXIF GPS parser + safety checkbox | `web/src/lib/geo.js:1` |
| `DetailScreen` + `TimelineScreen` | `web/src/pages/Detail.jsx:1` + `Timeline.jsx:1` same `GET /posts/:id`, `GET /road/:name/timeline` | road history signature |
| Hive offline queue | `localStorage bw:queue` + dataUrl fallback | retains `timestamp` observedAt |

## Demo Flow (web)
1. `POST /api/auth/seed-admin` + `POST /api/seed?demo=1`
2. Web: Post → choose photo (phone camera) → auto locate → AI suggest → safety ✓ → Post Report
3. Feed + Map show post with freshness + AI badge; Detail + Timeline per road
4. Admin verifies → status Verified
