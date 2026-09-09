import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import { existsSync, mkdirSync } from 'fs';
import db from './db.js';
import { geohash, photoHash, haversine } from './utils.js';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

if (!existsSync('./uploads')) mkdirSync('./uploads', { recursive: true });

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g,'_')}`)
});
const upload = multer({ storage, limits: { fileSize: 6 * 1024 * 1024 } });

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'Missing token' });
  try { req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Invalid token' }); }
}

app.get('/api/health', (_, res) => {
  const c = db.prepare('SELECT COUNT(*) as n, MIN(timestamp) as oldest FROM posts').get();
  const aiQueue = db.prepare("SELECT COUNT(*) as n FROM posts WHERE status='AI-Flagged'").get().n;
  res.json({ ok: true, postCount: c.n, oldestPostAge: c.oldest, aiQueue });
});

app.get('/api/posts', (req, res) => {
  const { bounds, status, roadCondition, feed, roadName, limit = 50 } = req.query;
  let sql = 'SELECT * FROM posts WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status=?'; params.push(status); }
  if (roadCondition) { sql += ' AND roadCondition=?'; params.push(roadCondition); }
  if (roadName) { sql += ' AND roadName=?'; params.push(roadName); }
  if (bounds) {
    const [lat1,lng1,lat2,lng2] = bounds.split(',').map(Number);
    const minLat = Math.min(lat1,lat2), maxLat = Math.max(lat1,lat2);
    const minLng = Math.min(lng1,lng2), maxLng = Math.max(lng1,lng2);
    sql += ' AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?';
    params.push(minLat,maxLat,minLng,maxLng);
  }
  sql += feed === 'true' ? ' ORDER BY timestamp DESC LIMIT ?' : ' ORDER BY timestamp DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/posts/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

app.get('/api/posts/road/:name/timeline', (req, res) => {
  const rows = db.prepare('SELECT * FROM posts WHERE roadName=? ORDER BY timestamp DESC').all(req.params.name);
  res.json(rows);
});

async function callAI(photoUrl, lat, lng) {
  try {
    const r = await fetch(`${AI_URL}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoUrl, lat, lng }) });
    if (!r.ok) throw new Error('AI down');
    return await r.json();
  } catch {
    return { isFlood: 1, severity: 'Moderate', condition: 'Difficult to Pass', confidence: 0.72, reason: 'Mock AI fallback — heuristic' };
  }
}

app.post('/api/posts', upload.single('photo'), async (req, res) => {
  const { caption, lat, lng, roadName, barangay, roadCondition, severity, exifLat, exifLng, exifTimestamp, description, authorId } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Photo required — camera capture mandatory' });
  if (!lat || !lng) return res.status(400).json({ error: 'Geolocation required' });
  const ts = req.body.timestamp || new Date().toISOString();
  const g = geohash(Number(lat), Number(lng));
  const pHash = photoHash(req.file.path + Date.now());
  const dup = db.prepare('SELECT id FROM posts WHERE photoHash=?').get(pHash);
  const dist = haversine(Number(lat), Number(lng), Number(exifLat), Number(exifLng));
  const ai = await callAI(`/uploads/${req.file.filename}`, Number(lat), Number(lng));
  let status = 'Submitted';
  if (dup) status = 'AI-Flagged';
  else if (dist != null && dist > 100) status = 'AI-Flagged';
  else if (ai.isFlood === 0 || ai.confidence < 0.6) status = 'AI-Flagged';
  else if (ai.confidence >= 0.75) status = 'AI-Verified';
  const id = uuid(), now = new Date().toISOString();
  const photoUrl = `/uploads/${req.file.filename}`;
  db.prepare(`INSERT INTO posts (id,caption,lat,lng,geohash,roadName,barangay,roadCondition,severity,timestamp,status,photoUrl,photoHash,exifLat,exifLng,exifTimestamp,aiIsFlood,aiSeverity,aiCondition,aiConfidence,aiReason,description,authorId,flags,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, caption||'', Number(lat), Number(lng), g, roadName||null, barangay||null, roadCondition||ai.condition, severity||ai.severity, ts, status, photoUrl, pHash, exifLat?Number(exifLat):null, exifLng?Number(exifLng):null, exifTimestamp||null, ai.isFlood?1:0, ai.severity, ai.condition, ai.confidence, ai.reason, description||null, authorId||null, dup?1:0, now, now);
  res.status(201).json({ id, status, ai, photoUrl, geohash: g, dist });
});

app.post('/api/posts/:id/ai-analyze', async (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const ai = await callAI(p.photoUrl, p.lat, p.lng);
  db.prepare('UPDATE posts SET aiIsFlood=?,aiSeverity=?,aiCondition=?,aiConfidence=?,aiReason=?,updatedAt=? WHERE id=?')
    .run(ai.isFlood?1:0, ai.severity, ai.condition, ai.confidence, ai.reason, new Date().toISOString(), p.id);
  res.json(ai);
});

app.patch('/api/posts/:id/verify', auth, (req, res) => {
  db.prepare("UPDATE posts SET status='Verified', verifiedBy=?, verifiedAt=?, updatedAt=? WHERE id=?").run(req.user.email, new Date().toISOString(), new Date().toISOString(), req.params.id);
  res.json({ ok: true });
});
app.patch('/api/posts/:id/clear', auth, (req, res) => {
  db.prepare("UPDATE posts SET status='Cleared', verifiedAt=?, updatedAt=? WHERE id=?").run(new Date().toISOString(), req.params.id);
  res.json({ ok: true });
});
app.patch('/api/posts/:id/flag', auth, (req, res) => {
  db.prepare("UPDATE posts SET status='AI-Flagged', flags=flags+1, updatedAt=? WHERE id=?").run(new Date().toISOString(), req.params.id);
  res.json({ ok: true });
});
app.delete('/api/posts/:id', auth, (req, res) => {
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/posts', auth, (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM posts';
  const p = [];
  if (status) { sql += ' WHERE status=?'; p.push(status); }
  sql += ' ORDER BY timestamp DESC LIMIT 100';
  res.json(db.prepare(sql).all(...p));
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.post('/api/auth/seed-admin', (req, res) => {
  const exists = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (exists) return res.status(400).json({ error: 'Admin exists' });
  const id = uuid(), hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id,email,password,role,createdAt) VALUES (?,?,?,?,?)').run(id, 'admin@bahawatch.ph', hash, 'admin', new Date().toISOString());
  res.json({ email: 'admin@bahawatch.ph', password: 'admin123' });
});

app.post('/api/seed', (req, res) => {
  const { demo } = req.query;
  if (!demo) return res.status(400).json({ error: 'Use ?demo=1' });
  const samples = [
    { roadName: 'Burgos St. - ISAT-U Gate', barangay: 'La Paz', lat: 10.706, lng: 122.554, roadCondition: 'Not Passable', severity: 'High' },
    { roadName: 'Burgos St. - ISAT-U Gate', barangay: 'La Paz', lat: 10.7061, lng: 122.5541, roadCondition: 'Difficult to Pass', severity: 'Moderate' },
    { roadName: 'Burgos St. - ISAT-U Gate', barangay: 'La Paz', lat: 10.7062, lng: 122.5542, roadCondition: 'Cleared', severity: 'Low' },
    { roadName: 'Jalandoni St.', barangay: 'La Paz', lat: 10.702, lng: 122.56, roadCondition: 'Not Passable', severity: 'High' },
    { roadName: 'Huervana St.', barangay: 'La Paz', lat: 10.71, lng: 122.55, roadCondition: 'Difficult to Pass', severity: 'Moderate' },
  ];
  const now = Date.now();
  samples.forEach((s,i) => {
    const id = uuid(), ts = new Date(now - (samples.length - i)* 15*60000).toISOString();
    db.prepare(`INSERT INTO posts (id,caption,lat,lng,geohash,roadName,barangay,roadCondition,severity,timestamp,status,photoUrl,photoHash,aiIsFlood,aiSeverity,aiCondition,aiConfidence,aiReason,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, `Demo post ${i+1} — ${s.roadCondition}`, s.lat, s.lng, geohash(s.lat,s.lng), s.roadName, s.barangay, s.roadCondition, s.severity, ts, i===samples.length-1?'Cleared':'Verified', `/uploads/demo-${i}.jpg`, `demo-hash-${i}`, 1, s.severity, s.roadCondition, 0.88, 'Seeded demo post', new Date().toISOString(), new Date().toISOString());
  });
  res.json({ seeded: samples.length });
});

cron.schedule('0 * * * *', () => {
  const sixHoursAgo = new Date(Date.now() - 6*3600000).toISOString();
  db.prepare("UPDATE posts SET status='Needs Update', updatedAt=? WHERE status IN ('Submitted','AI-Verified','Verified') AND timestamp < ?").run(new Date().toISOString(), sixHoursAgo);
  console.log('[cron] marked stale posts as Needs Update');
});

app.listen(PORT, () => console.log(`BAHAWATCH server http://localhost:${PORT} — AI=${AI_URL}`));
