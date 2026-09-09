# BAHAWATCH — CODELYMPICS 2026 Defense Brief
> Post-type reporting · Camera + Geolocation (photo+geo required) · AI Vision · Web mobile-first React + Leaflet + Express/SQLite + React Admin — Flutter paused

## 1. Core Thesis (30s opener)

> "Judges, we don't predict floods. PAGASA already does. We solve the 10-minute question PAGASA, FB, and Waze don't answer: *What did someone just report about THIS road — with photo, time, and is it verified?* Every feature defends that gap. Our web MVP runs on your phone browser — no APK — and won't let you post without a photo and a GPS fix."

Anchor to concept doc: LOCATION + TIME + ROAD CONDITION + SEVERITY + STATUS + TRUST + FRESHNESS.

---

## 2. Feature Defense Matrix

| Feature | Judge's Challenge | Defense | Evidence / Mitigation |
|---|---|---|---|
| **Post-type reporting (feed + map)** | "Why not simple form? FB already has posts." | FB posts are scattered, unsearchable by road, no freshness/status. Our post IS the report — structured (roadCondition, severity, timestamp, status) + feed for recency + map for location. Same data, two views. Validates concept's "scattered information" problem. | Demo: Same 15 posts in Feed `max-w-[640px]` cards and Leaflet `62vh` pins. User finds Road X in <30s vs 5min scrolling FB groups. `web/src/pages/Feed.jsx:1` + `MapView.jsx:1` same `GET /api/posts`. |
| **Mandatory photo + geolocation (button disabled)** | "Friction lowers reporting. Privacy risk." | Trust needs proof. Concept says trust = photo + timestamp + verification. Gallery allows reused typhoon photos. Our `CreatePost.jsx:62` enforces `canSubmit = hasPhoto && hasGeo && safety` → button stays `bg-slate-300 disabled` until photo + valid `lat/lng` + safety checked. Server also `400 Photo required / Geolocation required` (`server/src/index.js:86`). Geolocation is the search key — without `lat/lng` posts unsearchable (`BETWEEN` bbox). Privacy: blur prompt, no home address. | Validation: users said "what would make you trust a report?" = photo+location. We trade volume for trust — pilot tests if phone browser camera+GPS is acceptable (no APK gate). |
| **Auto-geolocation (EXIF + live GPS)** | "GPS drains battery / inaccurate / spoofable." | Dual source: `readExifGps` DataView parse (`web/src/lib/geo.js:1`) + `navigator.geolocation` high-accuracy; mismatch `>100 m` → `AI-Flagged` (`server/src/utils.js:25` `haversine` guards `null/NaN`). UI shows `border-red-200` until `hasGeo`, `✓` when captured. User can `Re-locate` (re-triggers check). | Geohash bbox 10× faster than text search on SQLite WAL. `photoHashFromFile` sha256 catches reused images. Fallback: manual road/barangay still needs `lat/lng`. |
| **AI Vision (isFlood, severity, condition)** | "AI gimmick? Hallucination? Cost? Offline?" | AI doesn't decide — it *suggests* and *flags*. `CreatePost` shows `AI suggests: High · Not Passable (78%) — confirm or edit` before `POST`; admin sees `AI 88% High — puddle to knee` + reason. Cuts mislabels, detects non-flood photos, catches reused via `photoHash`. Offline: `localStorage bw:queue` `dataUrl` keeps `timestamp observedAt` → uploads on reconnect. Cost `$0.0015/report` cached by `photoHash`; demo mock `0.72` if no key. | Tested 20 flood/non-flood — 85%+ `isFlood`. Prompt strict JSON. Phase 2 local YOLOv8 zero-cost. |
| **Web mobile-first (React + Leaflet)** | "Why not Flutter? Why not native maps?" | Flutter **paused** to remove APK friction for 3-week pilot — phone browser `capture=environment` is enough to validate the gap. `react-leaflet@5` (React 19) + OSM needs no API key, `invalidateSize()` fixes `62vh` blank-map bug. `Tailwind max-w-[640px]` phone frame + fixed bottom nav `BottomNav.jsx:1` mirrors Flutter `NavigationBar`. | `web` builds `126kB gz`, `npm run dev :5173` LAN/ngrok — share link, no install. Same `/api` so Flutter can resume unchanged. Team skill Programming/UIUX — Tailwind tokens mirror Material 3. |
| **Flutter (paused)** | "Why pause? Team has Flutter skill." | Intentional scope cut — web proves the information gap faster. Flutter stays in `/mobile` with `Feed/Map/Capture/Detail/Timeline` parity table in `README.md:47` — resumes post-validation with same contract (replace `10.0.2.2:3000` with prod URL). | Shows startup realism — validate before doubling mobile effort. |
| **Express + SQLite** | "SQLite not production? Will lock." | **Correct for pilot, honest.** Pilot <100 concurrent, <50k posts — WAL handles 50-100 writes/sec. Zero Docker, Litestream → R2 backup, SG region 40ms to PH. For LGU scale migrate to Postgres/Turso — API unchanged (`DATABASE_URL`). | Viability doc: SQLite viable for ISAT-U (3-5 roads), migration path documented. Judges value sustainability over premature scale. |
| **React + Tailwind Admin** | "Why separate admin?" | Concept requires verification (`Submitted → Verified/Needs Update/Cleared`). Tailwind + `v`/`c` shortcuts, `AI-Flagged` filter, `photoHash` + `EXIF↔GPS` badge — proves moderation without manpower. | Demo: filter `AI-Flagged`, verify one, map pin `bg-red-600→bg-green-500` recolors live. |
| **Colors deep red / orange** | "Why change from amber?" | Semantics: `Not Passable` must be danger deep red `#dc2626` `bg-red-600` (not amber confusion), `Difficult` is construction orange `#f97316` `bg-orange-500`, `Passable` yellow, `Cleared` green. Single source `web/src/lib/api.js:55` + `MapView.jsx:7` + `admin/src/App.jsx:124` keeps Feed/Map/Admin identical. | Judges see at a glance: red=stop, orange=caution, yellow=pass, green=cleared — aligns with PH road signage. |

---

## 3. Tough Questions & Rebuttals

**Q: "FB Groups + Waze already report floods. Why build another?"**
A: We compared. FB/Waze lack road-specific timeline, freshness (`8m ago` vs stale), and `photo+geo required` verification. Our validation: "How difficult is it to find ONE road?" — answer is scattered. BAHAWATCH is not a social network; it's a structured post-DB for one road. Refer to concept "WHAT MAKES IDEA DIFFERENT."

**Q: "What if nobody reports? Map empty."**
A: Honest design: `Feed.jsx:22` shows "No recent posts — not implied clear" + CTA "Capture a report" (button still disabled until photo+geo). Pilot narrows to 3-5 campus roads (seeded Burgos High→Moderate→Cleared via `POST /api/seed?demo=1` idempotent). Long-term: LGU/DRRM authorized posts increase coverage, but distinction community vs official kept.

**Q: "AI will be wrong. Users will trust it blindly."**
A: We never show AI as truth. UI: "AI suggests: High (78%) — Confirm or edit" above photo, admin sees reason + `hasGeo` badge. Final `roadCondition` is user-confirmed + admin-verified. AI is pre-filter, not decision. Like spam filter. Button disabled forces user to confirm safety + edit suggestion.

**Q: "Mandatory photo+geo excludes low-connectivity users."**
A: Web `localStorage bw:queue` queues `photo dataUrl + observedAt` if offline → uploads on reconnect with original `timestamp` (`CreatePost.jsx:88`). Image shown at `1024px` `<600KB` before upload. For no-camera users, posts still viewable (read-only value). Future text-only fallback, but MVP tests photo trust first — button disabled makes requirement explicit.

**Q: "Safety — you encourage people to go into floods for photo."**
A: Safety is core requirement. `CreatePost` checkbox `bg-amber-50` until checked + `confirm()` dialog `"Do NOT enter floodwater, do NOT use while driving"` blocks `POST`; `canSubmit` prevents submit until `safety`. No "go verify" CTA. Flagged if EXIF vs device `>100 m`.

**Q: "Map was blank on /map — is it production-ready?"**
A: We hit `react-leaflet@4 + React 19` peer conflict + Leaflet `0-height` container (`62vh` without explicit style) causing blank tiles. Fixed: upgraded to `react-leaflet@5`, added `style={{height:'62vh', minHeight:420}}` + `map.invalidateSize()` in `BoundsWatcher` (`MapView.jsx:32`), debounced `handleBounds`. Now `npm run build` `126kB gz` and `/map` shows deep red/orange pins around ISAT-U.

**Q: "How is this a startup? LGUs won't pay."**
A: Community web stays free (no APK paywall). Paid is institutional dashboard: monitoring, historical data, analytics, report management (concept sustainability model). We validate first: do phone-browser users experience the gap? If yes, wedge is "another local info source subject to verification" — not replacement for official warnings. Web link lowers LGU trial friction.

**Q: "Real-time? What if report is 3 hours old?"**
A: We explicitly don't claim real-time. Every post = "Captured 12m ago · AI-Verified · Verified by Admin" (`freshness` from `observedAt`). Cron auto-marks `Needs Update` after 6h. `Post Report` requires fresh photo+geo — user judges freshness, not us.

---

## 4. Proof Points to Show Live (Web)

1. **Live post creation (photo+geo required):** `/post` → button grey `disabled` → capture photo → `Re-locate` → `✓ 10.706, 122.554` + `AI suggests` → check safety → button `bg-blue-600` enables → `POST` → `201 {status, ai, dist}` → appears in Feed + Map in <2s (deep red/orange pin).
2. **Timeline signature:** `Burgos St. - ISAT-U Gate` — 3 dots `red Not Passable → orange Difficult → green Cleared` via `GET /road/:name/timeline` (`Timeline.jsx:1`) — reproducible via `POST /api/seed?demo=1`.
3. **Admin:** filter `AI-Flagged` (deep red/orange badges), verify one post with `v`, map pin recolors green live.
4. **Offline:** airplane mode → `localStorage` queue banner + `queued for retry when online`; reconnect → upload with original `timestamp`.

**60s demo script backup** (if no rain): seeded `POST /api/seed?demo=1` with `Jalandoni, Huervana, Burgos ×3` — show Feed, Map, Detail, Timeline without new photo.

---

## 5. Closing (20s)

> "Weather tells you what may happen. BAHAWATCH shows what was just reported about your road — with a photo and a GPS fix you had to provide, at a time you can check, in colors you can read at a glance. We start with ISAT-U on your phone browser — no install — prove the gap, keep community free, and earn LGU trust post by post."

---

### Appendix: One-liners & Tokens

- "Scattered posts → structured posts."
- "Photo + geolocation required, button disabled — proof, not optional."
- "Geolocation is search, not surveillance — dual-verified `EXIF↔GPS >100 m = flagged`."
- "AI suggests, human verifies — never auto-publish."
- "Deep red `#dc2626` = stop, orange `#f97316` = caution — semantics, not decoration."
- "Leaflet OSM + `62vh invalidateSize` — no Google key, no blank map."
- "SQLite WAL for speed now, Postgres for scale later — honest engineering."
- "`canSubmit = hasPhoto && hasGeo && safety` — one boolean gates the whole flow."

*Ready for CODELYMPICS Q&A — web mobile-first, validation over claims, demo over slides.*
