import db from './db.js';
import { geohash } from './utils.js';
import { v4 as uuid } from 'uuid';
const samples = [
  { roadName: 'Burgos St. - ISAT-U Gate', lat: 10.706, lng: 122.554, roadCondition: 'Not Passable', severity: 'High' },
  { roadName: 'Jalandoni St.', lat: 10.702, lng: 122.56, roadCondition: 'Difficult to Pass', severity: 'Moderate' },
];
samples.forEach(s => {
  const id = uuid();
  db.prepare('INSERT INTO posts (id,lat,lng,geohash,roadName,roadCondition,severity,timestamp,status,photoUrl,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, s.lat, s.lng, geohash(s.lat,s.lng), s.roadName, s.roadCondition, s.severity, new Date().toISOString(), 'Submitted', '/uploads/seed.jpg', new Date().toISOString(), new Date().toISOString());
});
console.log('seeded', samples.length);
