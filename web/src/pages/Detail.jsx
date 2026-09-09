import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchPost, freshness, photoUrl, conditionColor, statusColor } from '../lib/api.js'

export default function Detail() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetchPost(id).then(setPost).catch(e => setErr(e.message))
  }, [id])

  if (err) return <div className="mx-auto max-w-[640px] p-6 text-sm text-red-600">{err}</div>
  if (!post) return <div className="mx-auto max-w-[640px] p-6 text-sm text-slate-400">Loading…</div>

  return (
    <div className="mx-auto max-w-[640px] pb-28">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-3 py-2">
        <Link to="/" className="rounded-full border px-3 py-1 text-xs">← Feed</Link>
        <span className="text-sm font-semibold">{post.roadName || 'Report'}</span>
        <Link to={`/road/${encodeURIComponent(post.roadName || '')}`} className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">Timeline</Link>
      </div>
      {post.photoUrl && <img src={photoUrl(post.photoUrl)} alt="" className="w-full bg-slate-100 object-cover" style={{ maxHeight: 420 }} onError={e => (e.currentTarget.style.display='none')} />}
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusColor(post.status)}`}>{post.status}</span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${conditionColor(post.roadCondition)}`}>{post.roadCondition}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{post.severity}</span>
          {post.aiConfidence != null && <span className="rounded-full border bg-white px-2.5 py-1 text-xs">AI {Math.round(post.aiConfidence*100)}% {post.aiSeverity}</span>}
        </div>
        <p className="text-xs text-slate-500">{freshness(post.timestamp)} · {new Date(post.timestamp).toLocaleString()} · observed at capture</p>
        <h1 className="text-base font-bold leading-tight">{post.roadName || `${post.lat}, ${post.lng}`} {post.barangay ? `· ${post.barangay}` : ''}</h1>
        {post.caption && <p className="text-sm leading-relaxed">{post.caption}</p>}
        {post.description && <p className="text-sm text-slate-600">{post.description}</p>}
        <p className="text-xs text-slate-500">📍 {Number(post.lat).toFixed(5)}, {Number(post.lng).toFixed(5)} · {post.geohash || '—'}</p>
        {(post.exifLat || post.aiReason) && (
          <div className="rounded-xl border bg-slate-50 p-3 text-xs leading-relaxed">
            {post.exifLat && <p>EXIF GPS: {Number(post.exifLat).toFixed(5)}, {Number(post.exifLng).toFixed(5)} {post.exifTimestamp ? `· ${post.exifTimestamp}` : ''}</p>}
            {post.aiReason && <p className="mt-1 text-blue-800">AI: {post.aiReason} {post.aiConfidence ? `(${Math.round(post.aiConfidence*100)}%)` : ''}</p>}
            {post.photoHash && <p className="mt-1 font-mono text-[11px] text-slate-400">hash {post.photoHash} · dup check</p>}
          </div>
        )}
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs font-medium">Verification</p>
          <p className="mt-1 text-xs text-slate-600">Community report starts as <b>{post.status}</b>. Verified by admin means reviewed with photo evidence. “Needs Update” is auto-set after 6 h.</p>
        </div>
      </div>
    </div>
  )
}
