import { useEffect, useState, useCallback } from 'react'
import { fetchPosts, fetchHealth } from '../lib/api.js'
import PostCard from '../components/PostCard.jsx'

export default function Feed() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState(null)
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPosts({ status: filter || undefined, feed: true, limit: 50 })
      setPosts(data)
      fetchHealth().then(setHealth).catch(() => {})
    } catch { setPosts([]) }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])
  useEffect(() => { const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

  return (
    <div className="mx-auto max-w-[640px] px-3 pb-24 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-bold">Recent Reports</h1>
        <button onClick={load} className="rounded-full border bg-white px-3 py-1 text-xs">Refresh</button>
      </div>
      {health && (
        <p className="mb-2 text-[11px] text-slate-400">{health.postCount} posts · AI queue {health.aiQueue} · {health.oldestPostAge ? `oldest ${new Date(health.oldestPostAge).toLocaleDateString()}` : 'no posts yet'}</p>
      )}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {['', 'Verified', 'AI-Verified', 'AI-Flagged', 'Needs Update', 'Cleared'].map(s => (
          <button key={s || 'all'} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600'}`}>{s || 'All'}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1,2,3].map(i => <div key={i} className="h-[280px] animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center">
          <p className="text-sm font-medium">No recent posts</p>
          <p className="mt-1 text-xs text-slate-500">No report ≠ clear. If you are safe nearby, capture a photo.</p>
          <a href="/post" className="mt-3 inline-block rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white">Capture a report</a>
        </div>
      ) : (
        <div className="grid gap-3">
          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  )
}
