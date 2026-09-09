# BAHAWATCH — Project Plan

> Community Flood & Road Condition Information App | CODELYMPICS 2026 Student Innovators Edition

## 1. Overview

**Problem:** Gap between general weather information and recent, road-specific ground reports (passable / difficult / not passable / cleared).

**Solution:** Community-powered map where users submit location + road condition + severity + timestamp + optional media from a safe location; viewers see freshness, verification status, and condition timeline per road.

**Core Principle:** Do not predict floods, do not replace official warnings, do not recommend routes. Show recent, timestamped, structured reports so users judge evidence themselves.

## 2. Objectives & Success Criteria

| Objective | Success Metric |
|---|---|
| Collect recent reports | >50 valid reports during pilot, <60 min avg freshness |
| Verify usability | >80% of test users find road-specific condition without help |
| Trust | >70% rate information useful/trustworthy (when freshness+verification shown) |
| Coverage | 10+ distinct roads/areas with usable reports |
| Verification | >40% reports reviewed/verified via admin |
| Retention | >30% return usage during 2nd rain event |

## 3. Scope

### MVP (Must-Have) — Validate Value
1. Interactive Community Map (pins clustered by road condition color)
2. Location-specific Report View (severity, condition, time, photo, status)
3. Safe Report Submission (map pin + auto-location + condition + severity + optional photo/video + safety reminder)
4. Freshness Indicator (`8m ago`, `45m ago`, `Needs Update`)
5. Report Status workflow: `Submitted` → `Under Review` → `Verified` / `Needs Update` / `Cleared`
6. Road Condition Timeline (chronological history per road)
7. Basic Admin Dashboard (review, verify, clear, delete, flag)

### Explicitly Out of MVP
Predictive flood modeling, live PAGASA broadcast integration, push alerts, analytics, LGU/DRRM full monitoring, offline-first (only designed, not built).

### Phase 2 (Post-Validation)
Flood history heatmap, multiple-report grouping, community confirm, LGU dashboard, area alerts, analytics, offline cache + queued submit.

## 4. Tech Stack (Per Requirements)

**Mobile App:** Flutter (Dart) — Material 3, `google_maps_flutter` + `geolocator` + `image_picker`, `dio`/`http` for API, `sqflite`/`hive` for local offline queue cache
**Backend:** Node.js + Express.js + SQLite (`better-sqlite3`) + `multer` for media uploads, `jsonwebtoken` + `bcrypt` for auth, `cors` + `helmet`
**Design System:** Tailwind CSS (admin dashboard) + Material 3 tokens mirrored in Flutter theme for visual consistency
**Admin Dashboard:** React (Vite) + TypeScript + Tailwind CSS + React Router + TanStack Query, consuming same Express REST API
**Map & Geo:** Google Maps Platform (Flutter) ; Geocoding via Google Places / Nominatim fallback ; geohash + bounding-box queries in SQLite
**Storage:** Local filesystem `uploads/` (MVP) → migratable to S3/R2 later (5MB photo, 15s video limit)

## 5. Data Model

```ts
Report {
  id: uuid
  location: { lat, lng, roadName?, barangay?, landmark?, geohash }
  roadCondition: 'Passable' | 'Difficult to Pass' | 'Not Passable' | 'Cleared'
  severity: 'Low' | 'Moderate' | 'High'
  timestamp: ISO8601 // creation time, not upload time
  freshness: derived
  status: 'Submitted' | 'Under Review' | 'Verified' | 'Needs Update' | 'Cleared'
  media: { photoUrl?, videoUrl?, hasMedia: boolean }
  description?: string
  authorId?: string // anonymous allowed in MVP
  verification: { verifiedBy?, verifiedAt?, notes? }
  flags: number
  createdAt, updatedAt
}
```

Indexes: `geohash`, `roadName`, `timestamp desc`, `status`.

SQLite Schema (Express):
```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL, lng REAL NOT NULL, geohash TEXT,
  roadName TEXT, barangay TEXT, landmark TEXT,
  roadCondition TEXT CHECK(roadCondition IN ('Passable','Difficult to Pass','Not Passable','Cleared')),
  severity TEXT CHECK(severity IN ('Low','Moderate','High')),
  timestamp TEXT NOT NULL, -- observedAt ISO8601
  status TEXT DEFAULT 'Submitted',
  photoUrl TEXT, videoUrl TEXT,
  description TEXT, authorId TEXT,
  verifiedBy TEXT, verifiedAt TEXT,
  flags INTEGER DEFAULT 0,
  createdAt TEXT, updatedAt TEXT
);
CREATE INDEX idx_reports_geohash ON reports(geohash);
CREATE INDEX idx_reports_timestamp ON reports(timestamp DESC);
```

## 6. Architecture

```
[Flutter App] --REST JSON--> [Express.js API (:3000/api)]
      |                              |
      +-> sqflite (offline queue)    +-> SQLite (reports.db + better-sqlite3)
      +-> google_maps_flutter        +-> /uploads (multer) static serve
                                     +-> JWT auth middleware
                                     
[React + Tailwind Admin] --REST JSON--> [same Express API + /api/admin/*]
```

- Polling (30s) or manual pull-to-refresh for new reports in visible bounds (no realtime in MVP — add WebSocket/SSE in Phase 2).
- Cron (node-cron) job: auto-set `Needs Update` after 6h without new report per geohash.
- Image moderation via admin review (MVP).

**API Endpoints (Express):**
`GET /api/reports?bounds=lat1,lng1,lat2,lng2&status=&roadCondition=`
`GET /api/reports/:id` `GET /api/reports/road/:roadName/timeline`
`POST /api/reports` (multipart: fields + photo/video) `PATCH /api/reports/:id/verify|clear|flag`
`POST /api/auth/login` `GET /api/admin/reports` (React Tailwind dashboard)

## 7. Phased Roadmap (8 Weeks Pilot)

### Phase 0 — Preparation (Week 1)
- [ ] Finalize PRD from concept paper, define condition definitions with photos
- [ ] Figma wireframes: Map, Report Card, Submit Form (with safety modal), Timeline, React Tailwind Admin
- [ ] Setup repo: `mobile_flutter/`, `server_express_sqlite/`, `admin_react_tailwind/`, CI, lint
- [ ] Setup Express + SQLite backend, DB schema, `uploads/` + JWT auth, seed script
- [ ] Conduct 10-15 validation interviews (use Validation Questions in concept doc)

### Phase 1 — Core MVP Build (Weeks 2-4)
**Sprint 1 (W2): Map + Data**
- Map with pins, color by condition (green/yellow/red/gray), detail bottom sheet
- Fetch reports by bounds, freshness label, no-report empty state

**Sprint 2 (W3): Reporting**
- Submit form: map pin / use current location, roadCondition, severity, photo picker, safety checkbox
- Timestamp handling, offline-prepare stub (save locally, show "will upload when online" — no auto-sync yet)
- Validation, rate limit (1 report / 5 min / device)

**Sprint 3 (W4): Verification + Timeline**
- Status badges, admin auth + dashboard table
- Verify / Needs Update / Clear actions
- Road timeline component (vertical chronological list per geohash/roadName)

### Phase 2 — Pilot & Refinement (Weeks 5-6)
- [ ] Deploy Flutter APK/TestFlight + hosted Express + React Admin (e.g., Render/Fly.io)
- [ ] Recruit 20-30 pilot users from ISAT-U (students, faculty, staff)
- [ ] Simulated + real rain event reporting drill
- [ ] Collect metrics: time-to-find road, trust rating, willingness to report
- [ ] Bugfix: duplicate reports grouping, freshness thresholds tuning

### Phase 3 — Validation & Pitch (Weeks 7-8)
- [ ] Compare vs alternatives (FB groups, chats, Waze) — gap analysis table
- [ ] Measured results → update pitch deck (prove the 5 hypotheses)
- [ ] Define Phase 2 offline design (cached reads + queued writes with original timestamp)
- [ ] Handover docs + mentoring plan for ISATech/KWADRA TBI

## 8. Validation Plan

Run same 9 interview questions pre- and post-MVP with 2 cohorts:

- **Cohort A (Primary):** 15 residents/commuters flood-prone routes
- **Cohort B (Secondary):** 5 riders/drivers + 3 businesses + 2 LGU/DRRM contacts (for future need)

Record raw responses, no fake percentages. Test: can user answer "What was last reported for Road X, when, and is it verified?" in <30s.

## 9. Roles (5-person team)

- **Lead Dev / Backend** — Express + SQLite schema, REST APIs, auth, uploads
- **Mobile Dev** — Flutter map + reporting + offline queue (sqflite)
- **Admin Dev** — React + Tailwind dashboard (verification workflow)
- **UI/UX** — Figma, Tailwind tokens → Flutter ThemeData mapping, safety UX
- **Research / Data** — Interviews, metrics, analytics + Comms/Biz pitch

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| No reports / sparse coverage | Start narrow: 3-5 roads around campus, recruit class as seed contributors |
| Outdated reports | Prominent `Reported X min ago`, auto `Needs Update` after 3-6h, `Cleared` button |
| False reports | Require photo optional but prioritized, admin verify, flag button, duplicate corroboration |
| Safety encouragement | Safety modal + checkbox mandatory before submit, no "go check" CTA |
| No internet during typhoon | Show cached reports with `May be outdated` banner + design offline-queue for Phase 2 |

## 11. Development Standards

- Conventional Commits, PR reviews
- Offline timestamp rule: always store `observedAt` at creation, `uploadedAt` at sync — display `observedAt`
- No claim of "real-time" in UI copy — use "Recent reports"
- Privacy: blur faces/plates option, no exact home address required

## 12. Immediate Next Actions (This Week)

1. Create GitHub repo + init `server_express_sqlite` (Express + better-sqlite3 + uploads) + `mobile_flutter` + `admin_react_tailwind` (Vite + Tailwind)
2. Approve Figma flow (Map → Detail → Submit with safety reminder)
3. Run 10 validation interviews around campus
4. Build SQLite schema + Express seed route + 15 dummy reports for demo video

## 13. References

Links as in concept paper: HazardHunterPH, HANDA, PAGASA Flood Maps, See (2019) citizen science review.

---
*Stack lock: Flutter (mobile) + Express + SQLite (backend) + React + Tailwind (admin). Keep MVP online-first; offline queue (sqflite → POST on reconnect with original observedAt) lands in Phase 2.*
