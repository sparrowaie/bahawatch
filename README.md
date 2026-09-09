# BAHAWATCH — MVP

Post-type flood & road condition reporting with camera + geolocation + AI vision.

> **Pivot 2026-09-09:** Mobile Flutter **paused** for production. MVP is now **mobile-first Web** (`/web` — React + Tailwind) with identical features — runs on phone browsers, no APK gate for pilot. Flutter kept in `/mobile` for post-pilot resumption.

## Stack
- **Web (MVP):** React 19 + Vite + Tailwind 3 + React Router + Leaflet 1.9 (OSM) — mobile-first `max-w-[640px]` phone frame, fixed bottom nav, `62vh` map with `invalidateSize`
- **Mobile (paused):** Flutter (camera + geolocator + hive + google_maps) — not required for demo
- **Backend:** Express + `node:sqlite` (WAL) + multer + JWT — `POST /posts` validates `photoHash` (sha256) + `haversine` EXIF vs device GPS (>100 m → `AI-Flagged`)
- **AI:** Python FastAPI — OpenAI `gpt-4o-mini` vision or heuristic fallback (`POST /ai/analyze` → `{isFlood, severity, condition, confidence, reason}`)
- **Admin:** React + Vite + Tailwind — same `/api` with `v`/`c` shortcuts and `AI-Flagged` queue

## Quick Start

```bash
# Backend — must be running first
cd server && npm install && npm run dev
# POST http://localhost:3000/api/auth/seed-admin  -> admin@bahawatch.ph / admin123
# POST http://localhost:3000/api/seed?demo=1      -> 5 demo posts (Jalandoni, Huervana, Burgos ×3 timeline)

# AI (optional — fallback mock still works)
cd ai-service && pip install -r requirements.txt && uvicorn main:app --port 8000
# set OPENAI_API_KEY for real vision

# Web (MVP — mobile-first, use this for pilot)
cd web && npm install --legacy-peer-deps && npm run dev
# VITE_API_URL=http://localhost:3000 in web/.env
# open http://localhost:5173  (phone: same LAN IP or ngrok)

# Admin
cd admin && npm install && npm run dev
# VITE_API_URL=http://localhost:3000 -> http://localhost:5174 (or 5173 if web not running)

# Mobile (paused — still builds)
cd mobile && flutter pub get && flutter run --dart-define=API_URL=http://10.0.2.2:3000
```

## API
- `GET /api/health` → `{postCount, oldestPostAge, aiQueue}`
- `GET /api/posts?bounds=lat1,lng1,lat2,lng2&feed=true&limit=50` — bbox `BETWEEN` on SQLite; `feed=true` orders `timestamp DESC`
- `GET /api/posts/:id` · `GET /api/posts/road/:name/timeline` — signature road history (High→Moderate→Cleared)
- `POST /api/posts` multipart — **photo + lat/lng required** (`400` if missing) — fields `photo, lat, lng, roadName, barangay, roadCondition, severity, caption, timestamp, exifLat, exifLng`
- `POST /api/posts/:id/ai-analyze` · `PATCH /api/posts/:id/verify|clear|flag` · `DELETE /api/posts/:id` (auth)
- `POST /api/auth/login` · `GET /api/admin/posts?status=` (auth)
- `POST /api/seed?demo=1` — idempotent, ordered oldest→newest so Burgos Cleared is most recent

## Web MVP — parity with Mobile
| Mobile (Flutter) | Web (React) | Notes |
|---|---|---|
| `FeedScreen` pull-to-refresh + card | `web/src/pages/Feed.jsx:1` same card, `freshness`, `AI 88%` badge, `status` | `max-w-[640px]` centered, bottom nav `Feed` |
| `MapScreen` `google_maps` hueRed/Orange/Green/Yellow | `web/src/pages/MapView.jsx:1` Leaflet OSM `divIcon` hues + `BETWEEN` bounds | no Google API key; `react-leaflet@5` (React 19), `h-62vh min-420 invalidateSize`, debounced `BoundsWatcher` |
| `CaptureScreen` camera + `geolocator` + EXIF + `hive` queue | `web/src/pages/CreatePost.jsx:1` `input capture=environment` + `navigator.geolocation` + `readExifGps` (`web/src/lib/geo.js:1`) + `localStorage bw:queue` | `photo + geolocation required`, button `bg-slate-300` disabled until `photo && geo && safety` |
| `DetailScreen` + `TimelineScreen` | `web/src/pages/Detail.jsx:1` + `Timeline.jsx:1` — same `GET /posts/:id`, `GET /road/:name/timeline` | road history signature |
| Hive offline queue | `localStorage` queue + `dataUrl` fallback | retains `timestamp` `observedAt` |

### Design tokens
- **Map / badges:** `Not Passable` deep red `#dc2626` / `bg-red-600`, `Difficult to Pass` orange `#f97316` / `bg-orange-500`, `Passable` yellow `#eab308`, `Cleared` green `#22c55e` — consistent `web/src/lib/api.js:55` `conditionColor` + `web/src/pages/MapView.jsx:7` `colorByCondition` + `admin/src/App.jsx:124`
- **/post validation:** photo red dashed `border-red-300` until captured, location card `border-red-200` until `lat/lng` valid, safety amber until checked — `Post Report` button `disabled={!canSubmit}` + helper `Add photo · Add geolocation · Confirm safety`

## Demo Flow (web — 60s)
1. `POST /api/seed?demo=1` — Burgos timeline `Not Passable (High)` → `Difficult (Moderate)` → `Cleared (Low)` most recent.
2. Web `/post` → choose photo (phone camera) → auto `Re-locate` → `AI suggests: High · Not Passable (78%)` → `safety ✓` → `Post Report` enables → submit → `201 {status, ai, photoUrl, dist}`.
3. `/` Feed + `/map` show new post with `freshness` + AI badge; map pin deep red / orange / yellow / green; `BoundsWatcher` filters on pan/zoom `300ms` poll `30s`.
4. `/posts/:id` Detail + `/road/Burgos St. - ISAT-U Gate` Timeline — 3 dots `red→orange→green`.
5. Admin `http://localhost:5174` login `admin@bahawatch.ph / admin123` → filter `AI-Flagged` → `Verify (v)` / `Clear (c)` / `Timeline` / `Delete` → pin recolors.

## Troubleshooting
- `/map` blank → hard reload; Leaflet needs explicit height (`MapView.jsx:88` `style={{height:'62vh', minHeight:420}}` + `invalidateSize()`). Requires `react-leaflet@5` for React 19 — `npm install --legacy-peer-deps`.
- `/post` button grey → add photo (mandatory), allow location (geolocation required), check safety — `canSubmit = hasPhoto && hasGeo && safety`.
- CORS / 400 `Photo required` → backend enforces `multer` + `photoHashFromFile` (`server/src/utils.js:1`); ensure `VITE_API_URL` matches backend.
