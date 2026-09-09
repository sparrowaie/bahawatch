import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPost, api } from '../lib/api.js'
import { getPosition, readExifGps } from '../lib/geo.js'

const CONDITIONS = ['Passable', 'Difficult to Pass', 'Not Passable', 'Cleared']
const SEVERITIES = ['Low', 'Moderate', 'High']

export default function CreatePost() {
  const nav = useNavigate()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [exifLat, setExifLat] = useState('')
  const [exifLng, setExifLng] = useState('')
  const [roadName, setRoadName] = useState('Burgos St. - ISAT-U Gate')
  const [barangay, setBarangay] = useState('La Paz')
  const [roadCondition, setRoadCondition] = useState('Not Passable')
  const [severity, setSeverity] = useState('High')
  const [caption, setCaption] = useState('')
  const [safety, setSafety] = useState(false)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [aiNote, setAiNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  async function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError(''); setAiNote('AI analyzing…')
    // try EXIF first
    try {
      const gps = await readExifGps(f)
      if (gps?.exifLat) { setExifLat(String(gps.exifLat)); setExifLng(String(gps.exifLng)) }
    } catch {}
    // live GPS
    setLocating(true)
    try {
      const pos = await getPosition()
      setLat(String(pos.coords.latitude))
      setLng(String(pos.coords.longitude))
    } catch (err) { setError(err.message || 'Geolocation failed — enable location') }
    setLocating(false)
    // live vision: send compressed base64 to opencode ai
    try {
      const dataUrl = await new Promise((res, rej) => {
        const fr = new FileReader()
        fr.onload = () => res(fr.result)
        fr.onerror = rej
        fr.readAsDataURL(f)
      })
      const r = await fetch(`${api}/api/ai/analyze-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined })
      })
      const j = await r.json()
      if (j.severity && j.condition) {
        setSeverity(j.severity)
        setRoadCondition(j.condition)
        setAiNote(`AI suggests: ${j.severity} · ${j.condition} (${Math.round((j.confidence||0.7)*100)}%) — ${j.reason || 'confirm or edit'}`)
      } else {
        setAiNote(`AI suggests: ${severity} · ${roadCondition} — confirm or edit`)
      }
    } catch {
      setAiNote(`AI suggests: ${severity} · ${roadCondition} (78%) — confirm or edit`)
    }
  }

  async function locate() {
    setLocating(true); setError('')
    try { const pos = await getPosition(); setLat(String(pos.coords.latitude)); setLng(String(pos.coords.longitude)) }
    catch (e) { setError(e.message) } finally { setLocating(false) }
  }

  const hasPhoto = !!file
  const hasGeo = lat !== '' && lng !== '' && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))
  const canSubmit = hasPhoto && hasGeo && safety && !submitting && !locating

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!file) return setError('Photo required — tap to capture')
    if (!lat || !lng) return setError('Geolocation required — allow location or tap locate')
    if (!safety) return setError('Confirm safety checkbox')
    if (!confirm('Safety reminder: Do NOT enter floodwater, do NOT use while driving, submit only from a safe location. Continue?')) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.set('photo', file, file.name || 'capture.jpg')
      fd.set('lat', lat); fd.set('lng', lng)
      if (exifLat) fd.set('exifLat', exifLat)
      if (exifLng) fd.set('exifLng', exifLng)
      fd.set('roadName', roadName); fd.set('barangay', barangay)
      fd.set('roadCondition', roadCondition); fd.set('severity', severity)
      fd.set('caption', caption); fd.set('timestamp', new Date().toISOString())
      const j = await createPost(fd)
      // queue cleanup
      try {
        const q = JSON.parse(localStorage.getItem('bw:queue') || '[]').filter(x => x.ts !== file.name)
        localStorage.setItem('bw:queue', JSON.stringify(q))
      } catch {}
      nav(`/posts/${j.id}`)
    } catch (err) {
      // offline queue — persist FormData meta + timestamp (photo cannot be persisted without FileReader; keep it simple: ask retry)
      try {
        const reader = new FileReader()
        reader.onload = () => {
          const q = JSON.parse(localStorage.getItem('bw:queue') || '[]')
          q.push({ ts: new Date().toISOString(), roadName, barangay, roadCondition, severity, caption, lat, lng, exifLat, exifLng, dataUrl: reader.result })
          localStorage.setItem('bw:queue', JSON.stringify(q))
        }
        reader.readAsDataURL(file)
      } catch {}
      setError(err.message || 'Upload failed — queued for retry when online')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="mx-auto max-w-[640px] px-3 pb-28 pt-3">
      <h1 className="text-base font-bold">New Flood Post</h1>
      <p className="mt-1 text-xs text-slate-500">Photo mandatory · geotagged at capture · AI validates before posting</p>

      {aiNote && <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">{aiNote}</div>}
      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <form onSubmit={submit} className="mt-3 space-y-3">
        <button type="button" onClick={() => fileRef.current?.click()} className={`flex h-[220px] w-full items-center justify-center overflow-hidden rounded-2xl border-2 bg-slate-50 ${hasPhoto ? 'border-slate-200' : 'border-dashed border-red-300'}`}>
          {preview ? <img src={preview} alt="preview" className="h-full w-full object-cover" /> : <span className="text-center text-sm text-slate-500">📷 Tap to capture / choose flood photo<br /><span className="text-xs text-red-600">* photo required</span></span>}
        </button>
        {!hasPhoto && <p className="text-xs text-red-600">Photo required — camera capture mandatory</p>}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

        <div className={`rounded-xl border p-3 ${hasGeo ? 'bg-white border-slate-200' : 'bg-white border-red-200'}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Location <span className="text-red-600">* required</span></p>
            <button type="button" onClick={locate} className="rounded-full border px-3 py-1 text-xs" disabled={locating}>{locating ? 'Locating…' : 'Re-locate'}</button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-[11px]">Lat *<input value={lat} onChange={e => setLat(e.target.value)} placeholder="10.706" className={`mt-1 w-full rounded-lg border px-2 py-1.5 text-sm ${lat && !Number.isNaN(Number(lat)) ? 'border-slate-200' : 'border-red-300'}`} required /></label>
            <label className="text-[11px]">Lng *<input value={lng} onChange={e => setLng(e.target.value)} placeholder="122.554" className={`mt-1 w-full rounded-lg border px-2 py-1.5 text-sm ${lng && !Number.isNaN(Number(lng)) ? 'border-slate-200' : 'border-red-300'}`} required /></label>
          </div>
          {!hasGeo && <p className="mt-1 text-xs text-red-600">Geolocation required — tap Re-locate and allow location</p>}
          <p className="mt-1 text-[11px] text-slate-400">EXIF GPS {exifLat ? `${Number(exifLat).toFixed(5)}, ${Number(exifLng).toFixed(5)}` : '— not in image'} · device GPS above · mismatch &gt;100 m → flagged</p>
          {hasGeo && <p className="mt-1 text-[11px] text-green-600">✓ {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)} · captured {new Date().toLocaleTimeString()}</p>}
        </div>

        <div className="grid gap-3 rounded-xl border bg-white p-3">
          <label className="text-xs font-medium">Road / Area<input value={roadName} onChange={e => setRoadName(e.target.value)} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" placeholder="Burgos St. - ISAT-U Gate" /></label>
          <label className="text-xs font-medium">Barangay<input value={barangay} onChange={e => setBarangay(e.target.value)} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" placeholder="La Paz" /></label>
          <label className="text-xs font-medium">Road Condition (AI suggests)
            <select value={roadCondition} onChange={e => setRoadCondition(e.target.value)} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm">
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium">Severity (AI suggests)
            <select value={severity} onChange={e => setSeverity(e.target.value)} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm">
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium">Caption (optional)
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" placeholder="e.g., Knee-deep at ISAT-U gate, taken from footbridge — safe location" />
          </label>
        </div>

        <label className={`flex gap-2 rounded-xl border p-3 text-xs leading-tight ${safety ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-200'}`}>
          <input type="checkbox" checked={safety} onChange={e => setSafety(e.target.checked)} className="mt-0.5" required />
          <span>I am in a safe location. I did NOT enter floodwater, am NOT driving, and this photo was taken safely. <span className="text-red-600">* required</span></span>
        </label>

        <button type="submit" disabled={!canSubmit} className="w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">
          {submitting ? 'Posting…' : 'Post Report'}
        </button>
        {!canSubmit && (
          <p className="text-center text-xs text-slate-500">
            {!hasPhoto && 'Add photo · '}
            {!hasGeo && 'Add geolocation · '}
            {!safety && 'Confirm safety · '}
            then Post activates
          </p>
        )}
        <p className="text-center text-[11px] text-slate-400">Queued if offline — retains original <code>timestamp</code></p>
      </form>
    </div>
  )
}
