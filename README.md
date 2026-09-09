# BAHAWATCH — MVP

Post-type flood & road condition reporting with camera + geolocation + AI vision.

## Stack
- **Mobile:** Flutter (camera + geolocator + hive feed + google_maps)
- **Backend:** Express + SQLite (better-sqlite3) + multer + JWT
- **AI:** Python FastAPI mock (OpenAI vision or heuristic)
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

# Admin
cd admin && npm install && npm run dev
# set VITE_API_URL=http://localhost:3000

# Mobile
cd mobile && flutter pub get && flutter run --dart-define=API_URL=http://10.0.2.2:3000
```

## API
- `GET /api/health`
- `GET /api/posts?bounds=&feed=true`
- `POST /api/posts` (multipart: photo + lat/lng + roadName + roadCondition + severity + caption)
- `POST /api/posts/:id/ai-analyze`
- `PATCH /api/posts/:id/verify|clear|flag`
- `POST /api/auth/login` · `GET /api/admin/posts`

## Demo Flow
1. Admin seed + login
2. Mobile: Post tab → capture photo (auto geotag) → AI suggest → confirm → Post
3. Feed + Map show post with freshness + AI badge
4. Admin verifies → status → Verified
