import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { fetchPosts } from '../lib/api.js'

function colorByCondition(c) {
  if (c === 'Not Passable') return '#ef4444'
  if (c === 'Difficult to Pass') return '#f59e0b'
  if (c === 'Cleared') return '#22c55e'
  return '#eab308'
}
function pinIcon(condition) {
  const color = colorByCondition(condition)
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -9]
  })
}

function BoundsFetcher({ onBounds }) {
  const map = useMapEvents({
    moveend() {
      const b = map.getBounds()
      onBounds(`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`)
    },
  })
  useEffect(() => {
    const b = map.getBounds()
    onBounds(`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`)
  }, [map, onBounds])
  return null
}

export default function MapView() {
  const [posts, setPosts] = useState([])
  const [bounds, setBounds] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchPosts({ bounds: bounds || undefined, feed: false, limit: 100 })
        if (!cancelled) setPosts(data)
      } catch {}
    }
    load()
    const id = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [bounds])

  const center = useMemo(() => [10.706, 122.554], [])

  return (
    <div className="mx-auto max-w-[1024px] pb-20">
      <div className="sticky top-0 z-10 border-b bg-white px-3 py-2">
        <p className="text-center text-[11px] text-slate-500">Red Not Passable · Orange Difficult · Yellow Passable · Green Cleared · pan/zoom to filter</p>
      </div>
      <div className="h-[62vh] min-h-[420px] w-full sm:h-[68vh]">
        <MapContainer center={center} zoom={14} className="h-full w-full" scrollWheelZoom>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <BoundsFetcher onBounds={setBounds} />
          {posts.map(p => (
            <Marker key={p.id} position={[Number(p.lat), Number(p.lng)]} icon={pinIcon(p.roadCondition)}>
              <Popup>
                <div className="min-w-[180px] text-xs">
                  <p className="font-semibold">{p.roadName || 'Report'}</p>
                  <p>{p.roadCondition} · {p.severity} · {p.status}</p>
                  <p className="text-slate-500">{new Date(p.timestamp).toLocaleString()}</p>
                  <Link to={`/posts/${p.id}`} className="mt-1 inline-block font-medium text-blue-600">View details →</Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="px-3 py-3">
        <h2 className="text-sm font-semibold">{posts.length} reports in view</h2>
        <div className="mt-2 grid gap-2">
          {posts.slice(0, 8).map(p => (
            <Link key={p.id} to={`/posts/${p.id}`} className="flex items-center gap-3 rounded-xl border bg-white p-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorByCondition(p.roadCondition) }} />
              <span className="min-w-0 flex-1 truncate text-sm">{p.roadName || `${p.lat}, ${p.lng}`} <span className="text-xs text-slate-500">· {p.status}</span></span>
              <span className="text-xs text-slate-400">{p.roadCondition}</span>
            </Link>
          ))}
          {!posts.length && <p className="py-6 text-center text-sm text-slate-400">No reports in this area — pan to ISAT-U campus</p>}
        </div>
      </div>
    </div>
  )
}
