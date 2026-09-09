import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'fs';

if (!existsSync('./uploads')) mkdirSync('./uploads', { recursive: true });

const db = new DatabaseSync('./data.db');
db.exec(`PRAGMA journal_mode = WAL`);

db.exec(`
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  caption TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  geohash TEXT,
  roadName TEXT,
  barangay TEXT,
  roadCondition TEXT CHECK(roadCondition IN ('Passable','Difficult to Pass','Not Passable','Cleared')),
  severity TEXT CHECK(severity IN ('Low','Moderate','High')),
  timestamp TEXT NOT NULL,
  status TEXT DEFAULT 'Submitted',
  photoUrl TEXT NOT NULL,
  photoHash TEXT,
  exifLat REAL, exifLng REAL, exifTimestamp TEXT,
  aiIsFlood INTEGER, aiSeverity TEXT, aiCondition TEXT, aiConfidence REAL, aiReason TEXT,
  description TEXT, authorId TEXT,
  verifiedBy TEXT, verifiedAt TEXT,
  flags INTEGER DEFAULT 0,
  createdAt TEXT, updatedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_geo_time ON posts(geohash, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_photoHash ON posts(photoHash);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'admin', createdAt TEXT
);
`);

export default db;
