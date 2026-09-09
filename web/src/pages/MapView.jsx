import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { fetchPosts } from '../lib/api.js'
import AiSummary from '../components/AiSummary.jsx'

function colorByCondition(c) {
  if (c === 'Not Passable') return '#dc2626'
  if (c === 'Difficult to Pass') return '#f97316'
  if (c === 'Cleared') return '#22c55e'
  return '#eab308'
}

function pinIcon(condition) {
  const color = colorByCondition(condition)
  return L.divIcon({
    className: 'bw-pin',
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  })
}

function BoundsWatcher({ onBoundsChange }) {
  const map = useMapEvents({
    moveend() {
      const b = map.getBounds()
      onBoundsChange(`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`)
    },
  })
  useEffect(() => {
    const b = map.getBounds()
    onBoundsChange(`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`)
    // invalidateSize fixes 0-height on first paint / hot reload
    setTimeout(() => map.invalidateSize(), 100)
  }, [map, onBoundsChange])
  return null
}

export default function MapView() {
  const [posts, setPosts] = useState([])
  const [bounds, setBounds] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const center = useMemo(() => [10.706, 122.554], [])

  const handleBounds = useCallback((b) => {
    // only update if meaningfully different to avoid storm
    setBounds((prev) => (prev === b ? prev : b))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setErr('')
      try {
        const data = await fetchPosts({ bounds: bounds || undefined, feed: false, limit: 100 })
        if (!cancelled) setPosts(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load posts')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [bounds])

  return (
    <div className="mx-auto max-w-[1024px] pb-24">
      <div className="sticky top-[49px] z-10 border-y bg-white px-3 py-2">
        <p className="text-center text-[11px] leading-tight text-slate-600">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600" /> Not Passable</span>
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Difficult</span>
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400" /> Passable</span>
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Cleared</span>
          <span className="mx-2 hidden sm:inline">· pan/zoom to filter</span>
        </p>
      </div>

      {/* map — explicit height is required for Leaflet */}
      <div className="relative w-full bg-slate-100" style={{ height: '62vh', minHeight: 420, maxHeight: 720 }}>
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsWatcher onBoundsChange={handleBounds} />
          {posts.map((p) => {
            const lat = Number(p.lat)
            const lng = Number(p.lng)
            if (Number.isNaN(lat) || Number.isNaN(lng)) return null
            return (
              <Marker key={p.id} position={[lat, lng]} icon={pinIcon(p.roadCondition)}>
                <Popup>
                  <div className="min-w-[200px] text-xs leading-tight">
                    <p className="font-semibold">{p.roadName || 'Report'}</p>
                    <p className="mt-0.5">
                      <span className="font-medium">{p.roadCondition}</span> · {p.severity} · {p.status}
                    </p>
                    <p className="text-slate-500">{new Date(p.timestamp).toLocaleString()}</p>
                    {p.caption && <p className="mt-1 line-clamp-2 text-slate-700">{p.caption}</p>}
                    <Link to={`/posts/${p.id}`} className="mt-2 inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                      View details →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {loading && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full border bg-white px-3 py-1 text-xs shadow">
            Loading reports…
          </div>
        )}
      </div>

      <div className="px-3 py-3">
        <div className="mb-3">
          <AiSummary bounds={bounds} />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{posts.length} reports in view</h2>
          <button onClick={() => window.location.reload()} className="rounded-full border bg-white px-3 py-1 text-xs">Reload</button>
        </div>
        {err && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err} — check that server is running on {import.meta.env.VITE_API_URL || 'http://localhost:3000'}</p>}
        <div className="mt-2 grid gap-2">
          {posts.slice(0, 12).map((p) => (
            <Link key={p.id} to={`/posts/${p.id}`} className="flex items-center gap-3 rounded-xl border bg-white p-2.5 hover:bg-slate-50">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorByCondition(p.roadCondition) }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm">
                {p.roadName || `${p.lat}, ${p.lng}`} <span className="text-xs text-slate-500">· {p.status}</span>
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{p.roadCondition}</span>
            </Link>
          ))}
          {!loading && posts.length === 0 && !err && (
            <p className="py-8 text-center text-sm text-slate-400">
              No reports in this area — pan to ISAT-U campus (10.706, 122.554) or{' '}
              <Link to="/" className="text-blue-600 underline">open Feed</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
