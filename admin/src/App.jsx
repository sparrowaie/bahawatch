import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function freshness(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 60000
  if (d < 1) return 'just now'
  if (d < 60) return `${Math.floor(d)}m ago`
  if (d < 1440) return `${Math.floor(d/60)}h ago`
  return `${Math.floor(d/1440)}d ago`
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [posts, setPosts] = useState([])
  const [filter, setFilter] = useState('')
  const [email, setEmail] = useState('admin@bahawatch.ph')
  const [password, setPassword] = useState('admin123')
  const [health, setHealth] = useState(null)

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

  async function fetchPosts() {
    const qs = filter ? `?status=${filter}` : ''
    const r = await fetch(`${API}/api/admin/posts${qs}`, { headers: authHeader })
    if (r.ok) setPosts(await r.json())
  }

  async function fetchHealth() {
    const r = await fetch(`${API}/api/health`)
    if (r.ok) setHealth(await r.json())
  }

  useEffect(() => { if (token) fetchPosts(); fetchHealth() }, [token, filter])

  async function login(e) {
    e.preventDefault()
    const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const j = await r.json()
    if (j.token) { localStorage.setItem('token', j.token); setToken(j.token) } else alert(j.error)
  }

  async function seedAdmin() {
    const r = await fetch(`${API}/api/auth/seed-admin`, { method: 'POST' })
    alert(JSON.stringify(await r.json()))
  }

  async function seedDemo() {
    const r = await fetch(`${API}/api/seed?demo=1`, { method: 'POST' })
    alert(JSON.stringify(await r.json())); fetchPosts()
  }

  async function action(id, act) {
    if (act === 'delete' && !confirm('Delete this post?')) return
    const method = act === 'delete' ? 'DELETE' : 'PATCH'
    await fetch(`${API}/api/posts/${id}/${act === 'delete' ? '' : act}`, { method, headers: authHeader })
    fetchPosts(); fetchHealth()
  }

  // keyboard shortcuts v/c on focused list
  useEffect(() => {
    function onKey(e) {
      if (!posts.length) return
      if (e.key === 'v' && document.activeElement?.tagName !== 'INPUT') {
        const flagged = posts.find(p => p.status === 'AI-Flagged' || p.status === 'Submitted')
        if (flagged) action(flagged.id, 'verify')
      }
      if (e.key === 'c' && document.activeElement?.tagName !== 'INPUT') {
        const top = posts[0]
        if (top) action(top.id, 'clear')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [posts])

  async function openTimeline(roadName) {
    if (!roadName) return alert('No roadName for timeline')
    const r = await fetch(`${API}/api/posts/road/${encodeURIComponent(roadName)}/timeline`)
    const data = await r.json()
    alert(`${roadName} — ${data.length} posts:\n` + data.map(d => `· ${new Date(d.timestamp).toLocaleString()} — ${d.roadCondition} ${d.severity} [${d.status}]`).join('\n'))
  }

  if (!token) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={login} className="bg-white p-6 rounded-xl shadow w-full max-w-sm space-y-3">
        <h1 className="text-xl font-bold">BAHAWATCH Admin</h1>
        <p className="text-sm text-slate-500">React + Tailwind · Express + SQLite</p>
        <input className="w-full border p-2 rounded" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
        <input className="w-full border p-2 rounded" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" />
        <button className="w-full bg-blue-600 text-white p-2 rounded font-medium">Login</button>
        <button type="button" onClick={seedAdmin} className="w-full border p-2 rounded text-sm">Seed admin (admin@bahawatch.ph / admin123)</button>
        {health && <p className="text-xs text-slate-400">Health: {health.postCount} posts · oldest {health.oldestPostAge || '—'} · AI queue {health.aiQueue}</p>}
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-lg">BAHAWATCH Admin <span className="font-normal text-slate-500 text-sm">· Post-type + AI + Geo</span></h1>
          <div className="flex gap-2">
            <button onClick={seedDemo} className="border px-3 py-1.5 rounded text-sm bg-yellow-50">Seed Demo Posts</button>
            <button onClick={()=>{ localStorage.removeItem('token'); setToken('') }} className="text-sm text-slate-500">Logout</button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex gap-2 mb-4 flex-wrap">
          {['','Submitted','AI-Verified','AI-Flagged','Verified','Needs Update','Cleared'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} className={`px-3 py-1.5 rounded-full text-sm border ${filter===s?'bg-blue-600 text-white border-blue-600':'bg-white'}`}>{s||'All'}</button>
          ))}
          <button onClick={fetchPosts} className="ml-auto border bg-white px-3 py-1.5 rounded text-sm">Refresh</button>
        </div>
        {health && <div className="mb-3 text-xs text-slate-500">{health.postCount} posts · AI queue {health.aiQueue} · <a href={`${API}/uploads`} target="_blank" className="underline">uploads</a></div>}
        <div className="grid gap-3">
          {posts.map(p=>(
            <div key={p.id} className="bg-white rounded-xl border p-3 flex gap-3">
              <img src={`${API}${p.photoUrl}`} alt="" className="w-28 h-28 object-cover rounded-lg bg-slate-100" onError={e=>e.target.style.display='none'} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status==='Verified'?'bg-green-100 text-green-700':p.status==='AI-Flagged'?'bg-red-100 text-red-700':p.status==='AI-Verified'?'bg-blue-100 text-blue-700':'bg-slate-100'}`}>{p.status}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.roadCondition==='Not Passable'?'bg-red-500 text-white':p.roadCondition==='Difficult to Pass'?'bg-amber-400':p.roadCondition==='Cleared'?'bg-green-500 text-white':'bg-slate-200'}`}>{p.roadCondition}</span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{p.severity}</span>
                  {p.aiConfidence && <span className="text-xs border px-2 py-0.5 rounded-full">AI {Math.round(p.aiConfidence*100)}% {p.aiSeverity}</span>}
                  <span className="text-xs text-slate-400">{freshness(p.timestamp)} · {new Date(p.timestamp).toLocaleString()}</span>
                </div>
                <p className="font-medium text-sm mt-1 truncate">{p.roadName || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`} {p.barangay?`· ${p.barangay}`:''}</p>
                <p className="text-sm text-slate-600 line-clamp-1">{p.caption || p.description || '—'}</p>
                <p className="text-xs text-slate-400">📍 {p.lat.toFixed(5)}, {p.lng.toFixed(5)} · geohash {p.geohash} {p.exifLat?`· EXIF ${p.exifLat.toFixed(4)},${p.exifLng.toFixed(4)}`:''} {p.aiReason?`· AI: ${p.aiReason}`:''}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <button onClick={()=>action(p.id,'verify')} className="text-xs bg-green-600 text-white px-2.5 py-1 rounded">Verify (v)</button>
                  <button onClick={()=>action(p.id,'clear')} className="text-xs border px-2.5 py-1 rounded">Clear (c)</button>
                  <button onClick={()=>action(p.id,'flag')} className="text-xs border px-2.5 py-1 rounded">Flag</button>
                  <button onClick={()=>openTimeline(p.roadName)} className="text-xs border px-2.5 py-1 rounded bg-blue-50">Timeline</button>
                  <button onClick={()=>action(p.id,'delete')} className="text-xs border px-2.5 py-1 rounded text-red-600">Delete</button>
                  <a href={`${API}${p.photoUrl}`} target="_blank" className="text-xs border px-2.5 py-1 rounded">Photo</a>
                </div>
              </div>
            </div>
          ))}
          {!posts.length && <p className="text-center text-slate-400 py-12">No posts for filter "{filter||'All'}" — seed demo or submit from mobile.</p>}
        </div>
      </div>
    </div>
  )
}
