# BAHAWATCH — Optimized Project Plan
> Community Flood & Road Condition Information App | CODELYMPICS 2026 | Stack: Web (React + Tailwind mobile-first) + Express + SQLite + React Admin — Flutter paused

## Table of Contents
1. [Summary](#1-summary) · 2. [Stack](#2-stack) · 3. [Architecture](#3-architecture) · 4. [Data Model](#4-data-model) · 5. [Roadmap](#5-roadmap) · 6. [Board](#6-board) · 7. [Validation](#7-validation) · 8. [Risks](#8-risks) · 9. [Standards](#9-standards) · 10. [Next 72h](#10-next-72-hours) · 11. [Improvements](#11-suggested-improvements)

## 1. Summary

| Item | Decision |
|---|---|
| **Problem** | Gap between weather forecast and recent, road-specific passability |
| **MVP** | **Post-type feed + map** · camera capture with auto-geolocation + AI validation + freshness/verification + timeline + admin verify |
| **Non-goals** | Prediction, PAGASA live, push alerts, heatmaps — Phase 2 |
| **Timeline** | **4 weeks demoable** (was 8) — 3 parallel tracks |
| **Pilot** | 3-5 roads around ISAT-U, 20-30 users |

**Principle:** Backend first → unblocks Flutter & React; one SQLite DB, one REST contract; never claim "real-time" — show "Reported X ago".

## 2. Stack

| Layer | Choice | Why (optimized) |
|---|---|---|
| **Web (MVP)** | **React 19 + Vite + Tailwind 3 + React Router + Leaflet (OSM)** — mobile-first `max-w-[640px]` shell, bottom nav | **Replaces Flutter for pilot** — no APK gate, phone browser camera + `navigator.geolocation` + EXIF parse, `localStorage` queue |
| **Mobile (paused)** | Flutter + Riverpod + `google_maps_flutter` + `camera`/`image_picker` + `geolocator` + `exif` + `dio` + `hive` | Paused — kept in `/mobile`, will resume post-validation |
| **Backend** | Node + Express + `node:sqlite` WAL + `multer` + `jsonwebtoken` + **AI microservice** | Zero Docker, file DB; AI sidecar for image validation |
| **AI** | **Python FastAPI + Vision** (OpenAI `gpt-4o-mini` vision *or* local `YOLOv8`/`MobileNet` flood classifier) + `sharp` | Auto-verify flood in photo, suggest severity/condition, detect fake/reused image |
| **Admin** | React + Vite + Tailwind + `shadcn/ui` + TanStack Query | Same `/api/*`, shows AI confidence + geolocation + EXIF |
| **Geo** | geohash(7) + bbox `BETWEEN lat/lng` + EXIF GPS + device `navigator.geolocation` | Dual source: browser EXIF + live GPS, cross-validated |
| **Storage** | `server/uploads/` → `STORAGE_DRIVER=s3` later | MVP simple, swappable via env |
| **Hosting** | Fly.io/Render (BE + AI) + **Vercel (Web + Admin)** — `web` + `admin` as two Vite apps | Free tier + AI call < $0.01/report |

## 3. Architecture

```
[Web mobile-first :5173] -- fetch multipart --> [Express :3000/api]
  React feed + Leaflet map          |  multer /uploads
  capture capture=environment       +--> [AI Vision Service :8000/analyze]
  + navigator.geolocation           |      → {isFlood, severity, condition, confidence, isFake}
  + localStorage queue              +--> node:sqlite WAL reports.db
                                   +--> node-cron (6h → Needs Update)
                                          ^
[React Admin :5174] -- fetch -----> [same Express /api/admin/*]
  post moderation queue + AI badge

[Flutter :mobile — paused, same contract, resumes post-pilot]
```

- **Post-type flow:** Camera capture (mandatory image) → auto-embed `lat/lng` + `observedAt` at capture → AI analyze → POST post → feed + map pin.
- **Sync:** Poll 30s + pull-to-refresh (add SSE Phase 2)
- **Cron:** `0 * * * *` marks stale `Needs Update` per geohash
- **Auth:** JWT, public `GET`, auth `POST/PATCH`; anonymous submit allowed

Endpoints (9 total): `GET /api/posts?bounds=&feed=` · `GET /posts/:id` · `GET /posts/road/:name/timeline` · `POST /posts` (multipart: image + lat/lng/EXIF + fields) · `POST /posts/:id/ai-analyze` · `PATCH /posts/:id/{verify,clear,flag}` · `POST /auth/login` · `GET /health` · `POST /ai/analyze` (internal)

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

**Post-type:** image **required** (camera capture only, no gallery in MVP to ensure fresh geotagged photo), geolocation **dual**: `geolocator` live + EXIF GPS, mismatch >100m → `AI-Flagged`. AI fields auto-filled on upload, editable by user before submit, reviewable in React admin with confidence badge.

## 5. Roadmap — 4 Weeks

```
W0 D1-2  ███ Setup (BE + Figma + 10 interviews) parallel
W1       ████████ Core: GET bounds + map pins + detail + admin table
W2       ████████ Submit + safety modal + hive stub + admin verify
W3       ████████ Timeline + deploy (APK + BE + Admin) + recruit 20-30 users
W4       ████████ Rain drill + metrics + gap table + pitch deck
```

| Week | Backend | Web (MVP, replaces Flutter) | React Admin |
|---|---|---|---|
| **W0 D1-2** | `server` + `ai-service` (FastAPI) init, 9 endpoints, seed demo posts, JWT | Scaffolding `web/` Vite+React+Tailwind+Router+Leaflet, routes `/ /map /post /posts/:id /road/:name` | — |
| **W1** | `GET bounds` + bbox + `POST posts` multipart + AI proxy `POST /ai/analyze` | Feed cards + Leaflet pins + bottom nav + `X ago` + empty state CTA | Vite+Tailwind login + posts table with AI badge |
| **W2** | `PATCH` handlers + `photoHash` dup check + cron | **Create flow** (`capture=environment` → `navigator.geolocation` + EXIF → AI suggest → safety checkbox) → `POST` | Verify / Needs Update / Cleared / Delete + AI reason + EXIF diff + `v`/`c` |
| **W3** | Deploy (Fly/Render + Vercel for `web`+`admin`) | Timeline + Detail + offline `localStorage` queue (retains `timestamp`) | Filters + trust score |
| **W4** | — | Pilot on 3-5 campus roads via phone browser — each post must have live camera photo | Metrics stub |

Saved 4 weeks: parallel tracks, 4 Figma screens not 10, polling not WS, SQLite not Postgres, single campus scope.

## 6. Board (MoSCoW) — Post-type + AI

- **MUST W1-2:** post feed + map bounds query, camera capture with geolocation, `POST posts` multipart, AI `isFlood` + `severity` suggest, detail, verify
- **SHOULD W3:** timeline, EXIF vs GPS mismatch flag, photoHash duplicate detection
- **COULD Phase2:** offline auto-sync with queued `observedAt`, clustering, AI fake/reused image detection (pHash), trust score
- **WON'T:** heatmap, alerts, analytics, gallery upload (camera-only in MVP)

Owners: `BE:1`, `Flutter:1-2`, `Admin/Design:1` · Daily PR review.

## 7. Validation (Lean)

Same 9 questions pre/post, cohorts A=15 commuters, B=5 riders+2 LGU. Pass = answers "last report for Road X, when, verified?" in <30s. No % until data collected.

## 8. Risks

| Risk | Mitigation in plan |
|---|---|
| Sparse reports | 3-road focus + 15 seeded posts + class reporters |
| Stale data | `X min ago` prominent + cron Needs Update + Cleared |
| False reports | **Camera-only + AI `isFlood` check + photoHash dup** + admin verify + flag |
| AI error | Show `AI 78% · Suggested: High — user can override`, admin sees AI reason |
| Geolocation spoof | **Cross-check EXIF GPS vs device GPS (>100m = flagged)** + map pin drag requires re-AI |
| Offline | Hive queue keeps image + `observedAt` + GPS, uploads on reconnect |
| Safety | Modal blocks submit until checkbox + "Do not enter floodwater to take photo" |

## 9. Standards (Post + AI)

- One `.env` (`API_BASE_URL`, `MAPS_KEY`, `JWT_SECRET`, `OPENAI_API_KEY` or `AI_SERVICE_URL`)
- `observedAt` = camera shutter time (EXIF) vs `uploadedAt` — display `observedAt` ("Captured 8m ago")
- Camera-only in MVP (`camera` plugin, no gallery) ensures fresh geotagged image
- AI prompt (vision): "Is this a flooded road? Return JSON {isFlood:bool, severity:Low|Moderate|High, condition:Passable|Difficult|Not Passable, confidence:0-1, reason:string}"
- Copy: "Recent reports" not "real-time" · Blur faces/plates option · GPS required before AI call

## 10. Next 72 Hours

- [ ] Monorepo `server/` `ai-service/` `mobile/` `admin/` skeleton + CI
- [ ] BE `POST /posts` (multipart + geolocation) + AI `POST /ai/analyze` working + seed posts with photos
- [ ] Figma: post card + map + camera + AI suggest UI approved
- [ ] 10 interviews scheduled + test AI on 20 sample flood/non-flood images

## 11. Suggested Improvements

### A. Product (High Impact, Low Cost) — Post-type + AI
1. **Post feed + map toggle:** Instagram-like feed (newest post first) plus map view — same `posts` data, two presentations for judges.
2. **AI trust score:** `photoHash unique? + EXIF↔GPS match? + recency<30m? + AI confidence? + duplicates?` → badge "High/Med/Low · AI 85% High" (computed BE, shown in Flutter + Admin).
3. **Duplicate/Reused image check:** `pHash` on upload — if `photoHash` exists within 7 days → auto-flag "Possible reused photo — needs review".
4. **Camera guide overlay:** in-camera 4 reference thumbnails (ankle/knee/waist) + level horizon guide — cuts mislabels + improves AI accuracy.
5. **Cleared as first-class post:** green post card "Cleared 5m ago" with before/after photo overrides old red pin.
6. **Empty-state education:** "No post ≠ clear. Capture a photo if you're safe nearby" + camera CTA — addresses "What if nobody reports?"

### B. Technical (Polish) — AI & Geo
6. **SQLite WAL mode + `PRAGMA journal_mode=WAL`** — doubles write throughput for concurrent post uploads.
7. **Image compress in Flutter before AI + upload** (`flutter_image_compress` to 1024px, <600KB) — faster AI call + saves bandwidth.
8. **AI cost cap:** cache `photoHash → AI result` in SQLite, reuse if same image re-uploaded; fallback to heuristic if `OPENAI_API_KEY` missing (demo mode: mock AI 70% conf).
9. **Rate limit by deviceId hash** — prevents spam while allowing anonymous posts.
10. **Admin AI queue:** filter `AI-Flagged` / `EXIF mismatch` / `low confidence <0.6` — bulk verify with `v`/`c` shortcuts.
11. **E2E seed:** `POST /api/seed?demo=1` generates 3 roads × 5 post timeline (with sample flood photos + AI fields) — reproducible demo without rain.
12. **Health returns `oldestPostAge` + `postCount` + `aiQueue`** — admin freshness at glance.

### C. Process / Pitch
12. **Cut Figma to 1 day** using Tailwind UI + Material 3 template — don't design from scratch.
13. **Deploy Day 3** (not Week 3) — even empty BE on Fly.io catches CORS/env issues early.
14. **Pre-record 60s demo** with seeded timeline (High → Moderate → Cleared) — judges see signature feature without waiting for rain.
15. **Metrics sheet ready Week 1** (Google Sheet with 5 success metrics) — log during pilot, not after.

---
*Polished: 8→4 weeks, parallelized, scope-cut to campus, added trust/duplicate/empty-state improvements for higher validation score.*
