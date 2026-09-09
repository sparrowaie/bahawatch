# BAHAWATCH — Optimized Project Plan
> Community Flood & Road Condition Information App | CODELYMPICS 2026 | Stack: Web (React + Tailwind mobile-first) + Express + `node:sqlite` + React Admin — Flutter paused (2026-09-09)

## Table of Contents
1. [Summary](#1-summary) · 2. [Stack](#2-stack) · 3. [Architecture](#3-architecture) · 4. [Data Model](#4-data-model) · 5. [Roadmap](#5-roadmap) · 6. [Board](#6-board) · 7. [Validation](#7-validation) · 8. [Risks](#8-risks) · 9. [Standards](#9-standards) · 10. [Next 72h](#10-next-72-hours) · 11. [Improvements](#11-suggested-improvements)

## 1. Summary

| Item | Decision |
|---|---|
| **Problem** | Gap between weather forecast and recent, road-specific passability |
| **MVP** | **Post-type feed + map** · camera capture with **photo + geolocation required** (button disabled until `photo && geo && safety`) + AI validation + freshness/verification + timeline + admin verify |
| **Non-goals** | Prediction, PAGASA live, push alerts, heatmaps — Phase 2 |
| **Timeline** | **4 weeks demoable** (was 8) — 3 parallel tracks |
| **Pilot** | 3-5 roads around ISAT-U, 20-30 users via phone browser (no APK) |

**Principle:** Backend first → unblocks Web & Admin; one SQLite DB, one REST contract; never claim "real-time" — show "Reported X ago". Mobile-first web removes APK gate for pilot.

## 2. Stack

| Layer | Choice | Why (optimized) |
|---|---|---|
| **Web (MVP)** | **React 19 + Vite + Tailwind 3 + React Router + Leaflet 1.9 (OSM)** — `max-w-[640px]` phone frame, bottom nav, `62vh` map + `invalidateSize` | **Replaces Flutter for pilot** — `input capture=environment` + `navigator.geolocation` + EXIF `DataView` GPS + `localStorage` queue; no Google Maps key |
| **Mobile (paused)** | Flutter + Riverpod + `google_maps_flutter` + `camera`/`image_picker` + `geolocator` + `exif` + `dio` + `hive` | Paused — kept in `/mobile`, resumes post-validation (same `/api` contract) |
| **Backend** | Node + Express + `node:sqlite` WAL (`PRAGMA journal_mode=WAL`) + `multer` (6 MB) + `jsonwebtoken` + **AI microservice** | Zero Docker, file DB; `photoHashFromFile` sha256 + `haversine` guards; AI sidecar |
| **AI** | **Python FastAPI + Vision** (OpenAI `gpt-4o-mini` vision *or* heuristic) | `{isFlood, severity, condition, confidence, reason}` → `AI-Flagged` if `confidence<0.6` or `isFlood==0` |
| **Admin** | React + Vite + Tailwind | Same `/api/admin/*`, `AI queue` badge, `v`/`c` shortcuts |
| **Geo** | geohash(7) + bbox `BETWEEN lat/lng` + EXIF GPS + `navigator.geolocation` | Dual source cross-check `>100 m → AI-Flagged`; `POST /posts` requires `lat/lng` |
| **Storage** | `server/uploads/` → `STORAGE_DRIVER=s3` later | MVP simple, swappable via env |
| **Hosting** | Fly.io/Render (BE + AI) + **Vercel (Web + Admin)** — two Vite apps (`web` :5173, `admin` :5174) | Free tier + AI call <$0.01/report |

## 3. Architecture

```
[Web mobile-first :5173] -- fetch multipart --> [Express :3000/api]
  React feed + Leaflet map          |  multer /uploads (photoHash sha256)
  capture=environment               +--> [AI Vision :8000/analyze]
  + navigator.geolocation           |      → {isFlood, severity, condition, confidence, reason}
  + readExifGps DataView            |      → AI-Flagged / AI-Verified logic
  + canSubmit=photo&&geo&&safety    +--> node:sqlite WAL reports.db
  + localStorage bw:queue           +--> node-cron (6h → Needs Update)
                                    +--> geohash(7) + bbox BETWEEN
                                          ^
[React Admin :5174] -- fetch -----> [same Express /api/admin/*]
  post moderation + AI badge + v/c

[Flutter :mobile — paused, same contract, resumes post-pilot]
```

- **Post-type flow:** `hasPhoto && hasGeo && safety` → `POST /posts` (multipart) → `photoHashFromFile` + `haversine` EXIF vs device → `callAI` → `status` (`AI-Flagged` if dup/mismatch/low conf) → feed + map pin (deep red/orange/yellow/green).
- **Sync:** Poll `30s` + pull-to-refresh / `BoundsWatcher moveend` (add SSE Phase 2)
- **Cron:** `0 * * * *` marks stale `Needs Update` per `timestamp`
- **Auth:** JWT, public `GET`, auth `PATCH/DELETE`; anonymous submit allowed but `photo+geo` mandatory server-side (`400 Photo required / Geolocation required`)

Endpoints (9): `GET /api/posts?bounds=&feed=` · `GET /posts/:id` · `GET /posts/road/:name/timeline` · `POST /posts` (multipart: **photo + lat/lng required**) · `POST /posts/:id/ai-analyze` · `PATCH /posts/:id/{verify,clear,flag}` · `DELETE /posts/:id` · `POST /auth/login` · `GET /health` · `POST /ai/analyze` (internal)

## 4. Data Model

```sql
-- Post-type report = post with image + geolocation + AI
CREATE TABLE posts (
  id TEXT PRIMARY KEY, 
  caption TEXT, -- post body
  lat REAL NOT NULL, lng REAL NOT NULL, geohash TEXT,
  roadName TEXT, barangay TEXT,
  roadCondition TEXT CHECK(roadCondition IN ('Passable','Difficult to Pass','Not Passable','Cleared')),
  severity TEXT CHECK(severity IN ('Low','Moderate','High')),
  timestamp TEXT NOT NULL, -- observedAt = camera capture time
  status TEXT DEFAULT 'Submitted', -- + AI-assisted: 'AI-Verified' / 'AI-Flagged'
  photoUrl TEXT NOT NULL, photoHash TEXT, -- image mandatory, hash for duplicate/fake detection
  exifLat REAL, exifLng REAL, exifTimestamp TEXT, -- from image EXIF vs device GPS cross-check
  aiIsFlood INT, aiSeverity TEXT, aiCondition TEXT, aiConfidence REAL, aiReason TEXT,
  description TEXT, authorId TEXT, verifiedBy TEXT, verifiedAt TEXT, flags INT DEFAULT 0,
  createdAt TEXT, updatedAt TEXT
);
CREATE INDEX idx_geo_time ON posts(geohash, timestamp DESC);
CREATE INDEX idx_status ON posts(status);
CREATE INDEX idx_photoHash ON posts(photoHash);
```

**Post-type:** image **required** + geolocation **required** — web `CreatePost.jsx:62` `canSubmit = hasPhoto && hasGeo && safety` → button `disabled` grey `bg-slate-300` until met, server `400` if missing (`server/src/index.js:86`). Dual GPS: EXIF `readExifGps` + `navigator.geolocation`, mismatch `>100 m → AI-Flagged` (`haversine` guards `null/NaN`). Colors: `Not Passable` deep red `#dc2626` `bg-red-600`, `Difficult` orange `#f97316` `bg-orange-500`, `Passable` yellow `#eab308`, `Cleared` green `#22c55e` — shared `web/src/lib/api.js:55` `conditionColor` + `MapView.jsx:7` `colorByCondition`.

## 5. Roadmap — 4 Weeks

```
W0 D1-2  ███ Setup (BE + Figma + 10 interviews) parallel — BE 9 endpoints, seed, JWT done
W1       ████████ Core: GET bounds + map pins + detail + admin table (Leaflet h-62vh fix, react-leaflet 5)
W2       ████████ Submit + safety + photo+geo required + disabled button + admin verify + photoHash/haversine hardening
W3       ████████ Timeline + Detail + deploy (Web + BE + Admin on Vercel/Fly) + recruit 20-30 users
W4       ████████ Rain drill + metrics + gap table + pitch deck (seeded High→Moderate→Cleared backup)
```

| Week | Backend | Web (MVP, replaces Flutter) | React Admin |
|---|---|---|---|
| **W0 D1-2** | `server` + `ai-service` init, 9 endpoints, idempotent `seed?demo=1` (Jalandoni, Huervana, Burgos ×3), JWT | Scaffolding `web/` Vite+React+Tailwind+Router+Leaflet@5, routes `/ /map /post /posts/:id /road/:name`, `max-w-[640px]` | — |
| **W1** | `GET bounds` `BETWEEN` + bbox `POST posts` multipart + AI proxy `POST /ai/analyze` | Feed cards + Leaflet `divIcon` deep red/orange/yellow/green + `BoundsWatcher` debounced + `X ago` + empty CTA | Vite+Tailwind login + posts table AI badge |
| **W2** | `PATCH` handlers + `photoHashFromFile` dup + `haversine` guards + cron | **Create flow** (`capture=environment` → `readExifGps` + `getPosition` → AI suggest → `canSubmit` guard) → `POST` | Verify / Needs Update / Cleared / Delete + AI reason + EXIF diff + `v`/`c` |
| **W3** | Deploy (Fly/Render + Vercel `web`+`admin`) | Timeline + Detail + offline `localStorage bw:queue` (retains `timestamp`) + deep red/orange tokens | Filters + trust score |
| **W4** | — | Pilot 3-5 campus roads via **phone browser** — each post live camera photo | Metrics stub |

Saved 4 weeks: parallel tracks, mobile-first web (no APK signing), polling not WS, SQLite not Postgres, single campus.

## 6. Board (MoSCoW) — Post-type + AI

- **MUST W1-2:** post feed + map bounds query, camera capture **photo + geolocation required** (button disabled), `POST posts` multipart, AI `isFlood` + `severity` suggest, detail, verify
- **SHOULD W3:** timeline, EXIF vs GPS mismatch flag, photoHash duplicate detection, deep red/orange color system
- **COULD Phase2:** offline auto-sync with queued `observedAt`, clustering, AI fake/reused image (pHash), trust score
- **WON'T:** heatmap, alerts, analytics, gallery upload (camera-only in MVP)

Owners: `BE:1`, `Web:1`, `Admin/Design:1` (Flutter paused) · Daily PR review.

## 7. Validation (Lean)

Same 9 questions pre/post, cohorts A=15 commuters, B=5 riders+2 LGU. Pass = answers "last report for Road X, when, verified?" in <30s. **Web pilot:** share `https://…vercel.app` link, no APK friction — validate on phone browser. No % until data collected.

## 8. Risks

| Risk | Mitigation in plan |
|---|---|
| Sparse reports | 3-road focus + idempotent seeded Burgos timeline High→Moderate→Cleared + class reporters |
| Stale data | `X min ago` prominent + cron `Needs Update` + `Cleared` first-class |
| False reports | **Camera-only + photo+geo required + disabled button** + **photoHash dup** + AI `isFlood` + admin verify/flag |
| AI error | `AI 78% · Suggested: High — user can override`, admin sees `aiReason`, `canSubmit` forces user confirm |
| Geolocation spoof | **EXIF vs device `haversine` >100 m → flagged** + `lat/lng` required server 400 + re-locate button |
| Offline | Web `localStorage bw:queue` + `dataUrl` fallback keeps `observedAt`; mobile `Hive` retained |
| Safety | `web/src/pages/CreatePost.jsx:146` checkbox + confirm dialog blocks `POST`; `Post Report` stays `bg-slate-300` until `safety` |
| Map blank | Leaflet explicit `height 62vh min 420` + `invalidateSize()` + `react-leaflet@5` for React 19 |

## 9. Standards (Post + AI)

- One `.env` (`VITE_API_URL`, `JWT_SECRET`, `OPENAI_API_KEY` or `AI_SERVICE_URL`)
- `observedAt = timestamp` (capture time) vs `uploadedAt` — display `freshness(ts)` "Captured 8m ago" (`web/src/lib/api.js:5`)
- **Photo + geolocation required** — button disabled until `hasPhoto && hasGeo && safety` (`CreatePost.jsx:62`), server `400 Photo required / Geolocation required` (`server/src/index.js:86`)
- Camera via `capture=environment` (mobile browser) — gallery allowed but photo mandatory ensures fresh evidence
- **Colors:** `Not Passable` deep red `#dc2626` `bg-red-600`, `Difficult` orange `#f97316` `bg-orange-500`, `Passable` yellow `#eab308`, `Cleared` green `#22c55e` — single source `conditionColor`/`colorByCondition`
- AI prompt: "Is this a flooded road? Return JSON {isFlood:bool, severity:Low|Moderate|High, condition:Passable|Difficult|Not Passable, confidence:0-1, reason:string}"
- Copy: "Recent reports" not "real-time" · GPS required before AI call (`CreatePost.jsx:123` `Re-locate`) · `MapView` legend deep red/orange

## 10. Next 72 Hours

- [x] Monorepo `server/` `ai-service/` `web/` `admin/` + `mobile/` (paused) skeleton + CI — `web` builds `126kB gz`, `admin` `62kB gz`
- [x] BE `POST /posts` (multipart + `photoHashFromFile` + `haversine` guards + `lat/lng required`) + AI `POST /ai/analyze` working + idempotent seed with Burgos timeline
- [x] Web: feed + Leaflet map (`react-leaflet@5`, `h-62vh invalidateSize`) + `CreatePost` photo+geo required + disabled button + Detail + Timeline + `localStorage` queue
- [ ] 10 interviews scheduled + test AI on 20 flood/non-flood images + deploy `web`+`admin` to Vercel + recruit 20-30 via link

## 11. Suggested Improvements

### A. Product (High Impact, Low Cost) — Post-type + AI
1. **Post feed + map toggle:** same `posts` data, two views for judges — Feed `max-w-[640px]`, Map `max-w-[1024px]` `62vh`.
2. **AI trust score:** `photoHash unique? + EXIF↔GPS match? + recency<30m? + AI confidence?` → badge "High/Med/Low · AI 85% High" (BE computed).
3. **Duplicate/Reused image check:** `photoHashFromFile sha256` — if exists within 7 days → auto `AI-Flagged`.
4. **Camera guide overlay:** in-camera 4 thumbnails (ankle/knee/waist) + level guide — cuts mislabels + improves AI.
5. **Cleared as first-class post:** green `#22c55e` card "Cleared 5m ago" overrides old red pin — Burgos timeline ends green.
6. **Empty-state education:** "No post ≠ clear. Capture a photo if you're safe nearby" + CTA — addresses "What if nobody reports?" · `/post` button grey until `photo+geo+safety`.

### B. Technical (Polish) — AI & Geo
6. **SQLite WAL mode + `PRAGMA journal_mode=WAL`** — doubles write throughput for concurrent posts.
7. **Image compress in web before AI + upload** — `canvas` resize to `1024px <600KB` — faster AI + saves bandwidth (current `CreatePost` uses raw file).
8. **AI cost cap:** cache `photoHash → AI result` in SQLite, reuse if same image; fallback heuristic if `OPENAI_API_KEY` missing (demo mock `0.72`).
9. **Rate limit by deviceId hash** — prevents spam while allowing anonymous posts (photo+geo still required).
10. **Admin AI queue:** filter `AI-Flagged` / `EXIF mismatch` / `low confidence <0.6` — bulk `v`/`c` shortcuts done.
11. **E2E seed:** `POST /api/seed?demo=1` idempotent, Burgos timeline reproducible without rain.
12. **Health returns `oldestPostAge` + `postCount` + `aiQueue`** — admin freshness at glance.

### C. Process / Pitch
12. **Cut Figma to 1 day** using Tailwind UI + Material 3 template.
13. **Deploy Day 3** (not Week 3) — even empty BE on Fly.io catches CORS/env issues early — `web` via Vercel link for pilot (no APK).
14. **Pre-record 60s demo** with seeded timeline (High → Moderate → Cleared) — judges see signature feature without rain.
15. **Metrics sheet ready Week 1** (Google Sheet with 5 success metrics) — log during pilot, not after.

---
*Polished: 8→4 weeks, parallelized, scope-cut to campus, web mobile-first (Flutter paused), photo+geo required with disabled button, deep red/orange color system, Leaflet 62vh fix — higher validation score.*
