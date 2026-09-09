// browser geolocation + EXIF helpers
export function getPosition(options = { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

// minimal EXIF GPS parser via DataView — reads GPS IFD if present; fallback null
export async function readExifGps(file) {
  try {
    const buf = await file.arrayBuffer()
    const view = new DataView(buf)
    if (view.getUint16(0) !== 0xffd8) return null
    let offset = 2
    while (offset < view.byteLength) {
      if (view.getUint16(offset) !== 0xffe1) { offset += 2 + view.getUint16(offset + 2); continue }
      // APP1 — check Exif header
      if (view.getUint32(offset + 4) !== 0x45786966) break
      const tiff = offset + 10
      const little = view.getUint16(tiff) === 0x4949
      const get16 = (o) => view.getUint16(o, little)
      const get32 = (o) => view.getUint32(o, little)
      const ifd0 = tiff + get32(tiff + 4)
      const entries = get16(ifd0)
      let gpsPtr = null
      for (let i = 0; i < entries; i++) {
        const tag = get16(ifd0 + 2 + i * 12)
        if (tag === 0x8825) gpsPtr = get32(ifd0 + 2 + i * 12 + 8)
      }
      if (gpsPtr == null) return null
      const gpsIfd = tiff + gpsPtr
      const gEntries = get16(gpsIfd)
      let latRef, latVal, lngRef, lngVal
      for (let i = 0; i < gEntries; i++) {
        const base = gpsIfd + 2 + i * 12
        const tag = get16(base), type = get16(base + 2), count = get32(base + 4)
        const valOff = base + 8
        if (tag === 1) latRef = String.fromCharCode(view.getUint8(little ? valOff : valOff))
        if (tag === 3) lngRef = String.fromCharCode(view.getUint8(little ? valOff : valOff))
        if (tag === 2 || tag === 4) {
          const ptr = type === 5 ? tiff + get32(valOff) : valOff
          const r = (o) => get32(o) / get32(o + 4)
          const degs = r(ptr) + r(ptr + 8) / 60 + r(ptr + 16) / 3600
          if (tag === 2) latVal = degs
          if (tag === 4) lngVal = degs
        }
      }
      if (latVal != null && lngVal != null) {
        if (latRef === 'S') latVal = -latVal
        if (lngRef === 'W') lngVal = -lngVal
        return { exifLat: latVal, exifLng: lngVal }
      }
      break
    }
  } catch {}
  return null
}
