import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchTimeline, freshness, conditionColor, statusColor } from '../lib/api.js'
import AiSummary from '../components/AiSummary.jsx'

export default function Timeline() {
  const { roadName } = useParams()
  const name = decodeURIComponent(roadName || '')
  const [posts, setPosts] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    fetchTimeline(name).then(setPosts).catch(e => setErr(e.message))
  }, [name])

  return (
    <div className="mx-auto max-w-[640px] pb-28">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-3 py-2">
        <Link to="/" className="rounded-full border px-3 py-1 text-xs">← Feed</Link>
        <h1 className="truncate text-sm font-bold">{name || 'Timeline'}</h1>
      </div>
      <div className="px-3 py-3">
        <p className="text-xs text-slate-500">Chronological condition history for this road — signature BAHAWATCH feature.</p>
        <div className="mt-3">
          <AiSummary roadName={name} />
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <ol className="relative mt-4 border-l border-slate-200">
          {posts.map((p, i) => (
            <li key={p.id} className="relative ml-4 pb-6">
              <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white shadow" style={{ background: p.roadCondition === 'Not Passable' ? '#ef4444' : p.roadCondition === 'Cleared' ? '#22c55e' : '#f59e0b' }} />
              <div className="rounded-xl border bg-white p-3">
                <div className="flex flex-wrap items-center gap-1">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${conditionColor(p.roadCondition)}`}>{p.roadCondition}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">{p.severity}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusColor(p.status)}`}>{p.status}</span>
                  <span className="ml-auto text-[11px] text-slate-400">{freshness(p.timestamp)} · {new Date(p.timestamp).toLocaleString()}</span>
                </div>
                {p.caption && <p className="mt-2 text-sm">{p.caption}</p>}
                <Link to={`/posts/${p.id}`} className="mt-2 inline-block text-xs font-medium text-blue-600">Open post →</Link>
              </div>
            </li>
          ))}
          {!posts.length && !err && <li className="ml-4 py-8 text-center text-sm text-slate-400">No posts for this road yet.</li>}
        </ol>
        {posts.length >= 2 && (
          <div className="mt-2 rounded-xl border bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            Showing {posts.length} reports from {new Date(posts[posts.length-1].timestamp).toLocaleString()} → {new Date(posts[0].timestamp).toLocaleString()} — condition {posts[posts.length-1].roadCondition} → {posts[0].roadCondition}.
          </div>
        )}
      </div>
    </div>
  )
}
