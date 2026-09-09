import { createHash } from 'crypto';
import { readFileSync } from 'fs';

export function geohash(lat, lng, precision = 7) {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let idx = 0, bit = 0, even = true, hash = '';
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { idx = idx * 2 + 1; lngMin = mid; } else { idx = idx * 2; lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { idx = idx * 2 + 1; latMin = mid; } else { idx = idx * 2; latMax = mid; }
    }
    even = !even;
    if (++bit === 5) { hash += base32[idx]; bit = 0; idx = 0; }
  }
  return hash;
}

export function photoHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

export function photoHashFromFile(filePath) {
  const buf = readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

export function haversine(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  if ([lat1,lng1,lat2,lng2].some(v => typeof v !== 'number' || Number.isNaN(v))) return null;
  const R = 6371000, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
