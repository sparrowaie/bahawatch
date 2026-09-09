const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const api = API

export function freshness(ts) {
  if (!ts) return '—'
  const m = (Date.now() - new Date(ts).getTime()) / 60000
  if (m < 1) return 'just now'
  if (m < 60) return `${Math.floor(m)}m ago`
  if (m < 1440) return `${Math.floor(m/60)}h ago`
  return `${Math.floor(m/1440)}d ago`
}

export async function fetchPosts({ bounds, status, feed = true, limit = 50 } = {}) {
  const qs = new URLSearchParams()
  if (bounds) qs.set('bounds', bounds)
  if (status) qs.set('status', status)
  if (feed) qs.set('feed', 'true')
  qs.set('limit', String(limit))
  const r = await fetch(`${API}/api/posts?${qs}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function fetchPost(id) {
  const r = await fetch(`${API}/api/posts/${id}`)
  if (!r.ok) throw new Error('Not found')
  return r.json()
}

export async function fetchTimeline(roadName) {
  const r = await fetch(`${API}/api/posts/road/${encodeURIComponent(roadName)}/timeline`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function fetchHealth() {
  const r = await fetch(`${API}/api/health`)
  return r.json()
}

export async function createPost(formData) {
  const r = await fetch(`${API}/api/posts`, { method: 'POST', body: formData })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `Upload failed ${r.status}`)
  return j
}

export function photoUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API}${path}`
}

export function conditionColor(c) {
  if (c === 'Not Passable') return 'bg-red-600 text-white border-red-700'
  if (c === 'Difficult to Pass') return 'bg-orange-500 text-white border-orange-600'
  if (c === 'Cleared') return 'bg-green-500 text-white border-green-600'
  return 'bg-yellow-100 text-slate-700 border-yellow-200'
}

export function statusColor(s) {
  if (s === 'Verified') return 'bg-green-100 text-green-700 border-green-200'
  if (s === 'AI-Flagged') return 'bg-red-100 text-red-700 border-red-200'
  if (s === 'AI-Verified') return 'bg-blue-100 text-blue-700 border-blue-200'
  if (s === 'Needs Update') return 'bg-orange-100 text-orange-700 border-orange-200'
  if (s === 'Cleared') return 'bg-green-50 text-green-700 border-green-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}
