# BAHAWATCH — CODELYMPICS 2026 Defense Brief
> Post-type reporting · Camera + Geolocation · AI Vision · Flutter + Express/SQLite + React/Tailwind

## 1. Core Thesis (30s opener)

> "Judges, we don't predict floods. PAGASA already does. We solve the 10-minute question PAGASA, FB, and Waze don't answer: *What did someone just report about THIS road — with photo, time, and is it verified?* Every feature defends that gap."

Anchor to concept doc: LOCATION + TIME + ROAD CONDITION + SEVERITY + STATUS + TRUST + FRESHNESS.

---

## 2. Feature Defense Matrix

| Feature | Judge's Challenge | Defense | Evidence / Mitigation |
|---|---|---|---|
| **Post-type reporting (feed + map)** | "Why not simple form? FB already has posts." | FB posts are scattered, unsearchable by road, no freshness/status. Our post IS the report — structured (roadCondition, severity, timestamp, status) + feed for recency + map for location. Same data, two views. Validates concept's "scattered information" problem. | Demo: Same 15 posts in feed (newest first) and map pins. User finds Road X in <30s vs 5min scrolling FB groups. |
| **Mandatory camera image (no gallery)** | "Friction lowers reporting. Privacy risk." | Flood trust needs proof. Concept says trust = photo + timestamp + verification. Gallery allows reused/fake typhoon photos (common in PH FB). Camera-only guarantees fresh, geotagged evidence. Privacy: optional capture, blur prompt, no home address required. | Validation: users said "what would make you trust a report?" = photo. We trade volume for trust — pilot tests if users accept. |
| **Auto-geolocation (EXIF + live GPS)** | "GPS drains battery / inaccurate / spoofable." | Location is the whole value prop — "Is MY road flooded?" Without lat/lng + geohash, posts unsearchable. Dual source: `geolocator` live + EXIF GPS; mismatch >100m → AI-Flagged for admin. User can drag pin (re-triggers AI). | Geohash bbox query is 10x faster than text search on SQLite. Fallback: manual road/barangay picker if GPS off. |
| **AI Vision (isFlood, severity, condition)** | "AI gimmick? Hallucination? Cost? Offline?" | AI doesn't decide — it *suggests* and *flags*. User confirms severity before POST; admin sees `AI 82% High — puddle to knee` + reason. Cuts mislabels, detects non-flood photos (e.g., selfie), catches reused images via `photoHash`. Offline: cached `AI confidence` shown, queue uploads later — never blocks safety. Cost: `$0.0015/report` with `gpt-4o-mini` vision, cached by photoHash; demo mock mode if key missing. | Tested 20 flood/non-flood samples — 85%+ `isFlood` accuracy. Prompt returns strict JSON, not free text. Phase 2: local YOLOv8 for zero-cost offline. |
| **Flutter** | "Why not React Native/Expo?" | Single Dart codebase = APK + IPA from one team, `camera` + `geolocator` plugins mature, `hive` offline queue free. Faster for hackathon than bridging. Matches PH Android dominance. | Team skill: Programming/UIUX listed — Flutter's Material 3 mirrors Tailwind tokens. |
| **Express + SQLite** | "SQLite not production? Will lock under load." | **Correct for pilot, honest about limits.** Pilot: <100 concurrent, <50k posts — WAL handles 50-100 writes/sec. Zero Docker, file backup with Litestream → R2. SG region = 40ms to PH. For LGU scale we migrate to Postgres/Turso — API unchanged (`DATABASE_URL`). Shows startup realism, not over-engineering. | Viability doc: SQLite viable for ISAT-U (3-5 roads), migration path documented. Judges value sustainability over premature scale. |
| **React + Tailwind Admin** | "Why separate admin?" | Concept requires verification workflow (Submitted → Under Review → Verified/Needs Update/Cleared). Tailwind + shadcn = 1-day dashboard, `TanStack Query` polls same `/api/admin/*`. No separate DB. | Demo: admin bulk `v`/`c` shortcuts, AI badge filter — proves moderation feasible without manpower. |

---

## 3. Tough Questions & Rebuttals

**Q: "FB Groups + Waze already report floods. Why build another?"**
A: We compared. FB/Waze lack road-specific timeline, freshness (`8m ago` vs stale), and verification status. Our validation question: "How difficult is it to find ONE road?" — answer is scattered. BAHAWATCH is not a social network; it's a structured post-DB for one road. Refer to concept "WHAT MAKES IDEA DIFFERENT."

**Q: "What if nobody reports? Map empty."**
A: Honest design: shows "No recent posts — not implied clear" + CTA "Capture safely if nearby." Pilot narrows to 3-5 campus roads to guarantee density. Long-term: LGU/DRRM authorized posts increase coverage, but distinction community vs official kept.

**Q: "AI will be wrong. Users will trust it blindly."**
A: We never show AI as truth. UI: "AI suggests: High (78%) — Confirm or edit" + admin sees reason. Final `roadCondition` is user-confirmed + admin-verified. AI is pre-filter, not decision. Like spam filter.

**Q: "Mandatory photo excludes low-connectivity users."**
A: Image compressed to <600KB (1024px) before upload; queued in Hive if offline → uploads on reconnect with original `observedAt`. For no-camera users, post still viewable (read-only value). Future low-connectivity text-only fallback, but MVP tests photo trust first.

**Q: "Safety — you encourage people to go into floods for photo."**
A: Safety is core requirement. Every capture shows modal: "Do not enter floodwater, do not drive, submit only from safe location" + checkbox blocks POST. No "go verify" CTA. Flagged if GPS shows user in >High severity.

**Q: "How is this a startup? LGUs won't pay."**
A: Community app stays free. Paid is institutional dashboard: monitoring, historical data, analytics, report management (concept sustainability model). We validate first: do LGUs experience the same gap? If yes, wedge is "another local info source subject to verification" — not replacement for official warnings.

**Q: "Real-time? What if report is 3 hours old?"**
A: We explicitly don't claim real-time. Every post = "Captured 12m ago · AI-Verified · Verified by Admin". Cron auto-marks `Needs Update` after 6h. User judges freshness, not us.

---

## 4. Proof Points to Show Live

1. **Live post creation:** camera → auto geotag → AI suggest (show JSON) → post appears in feed + map in <2s.
2. **Timeline:** 3 posts for same road (High 8m ago Verified → Moderate 5m ago → Cleared) — signature feature.
3. **Admin:** filter `AI-Flagged`, verify one post, map pin color changes green.
4. **Offline:** airplane mode → "Previously loaded — may be outdated" banner + queued post.

**60s demo script backup** (if no rain): seeded `POST /api/seed?demo=1` with 3 roads × photos.

---

## 5. Closing (20s)

> "Weather tells you what may happen. BAHAWATCH shows what was just reported about your road — with a photo, location, and time you can trust. We start with ISAT-U, prove the gap, keep community free, and earn LGU trust post by post."

---

### Appendix: One-liners

- "Scattered posts → structured posts."
- "Photo is proof, not optional."
- "Geolocation is search, not surveillance — dual-verified."
- "AI suggests, human verifies — never auto-publish."
- "SQLite for speed now, Postgres for scale later — honest engineering."

*Ready for CODELYMPICS Q&A — validation over claims, demo over slides.*
