import { Link } from 'react-router-dom'
import { freshness, photoUrl, conditionColor, statusColor } from '../lib/api.js'

export default function PostCard({ post }) {
  const ts = post.timestamp
  return (
    <article className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      {post.photoUrl && (
        <Link to={`/posts/${post.id}`} className="block">
          <img src={photoUrl(post.photoUrl)} alt={post.caption || post.roadName} className="h-[220px] w-full object-cover bg-slate-100" loading="lazy"
            onError={e => (e.currentTarget.style.display = 'none')} />
        </Link>
      )}
      <div className="p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusColor(post.status)}`}>{post.status}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${conditionColor(post.roadCondition)}`}>{post.roadCondition}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">{post.severity}</span>
          {post.aiConfidence != null && (
            <span className="rounded-full border bg-white px-2 py-0.5 text-[11px]">AI {Math.round(post.aiConfidence * 100)}% {post.aiSeverity}</span>
          )}
          <span className="ml-auto text-[11px] text-slate-400">{freshness(ts)} · {new Date(ts).toLocaleString()}</span>
        </div>
        <Link to={`/posts/${post.id}`} className="mt-2 block">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight">{post.roadName || `${Number(post.lat).toFixed(4)}, ${Number(post.lng).toFixed(4)}`} {post.barangay ? `· ${post.barangay}` : ''}</h3>
          {post.caption && <p className="mt-1 line-clamp-2 text-[13px] text-slate-600">{post.caption}</p>}
        </Link>
        <p className="mt-1 text-[11px] text-slate-400">📍 {Number(post.lat).toFixed(5)}, {Number(post.lng).toFixed(5)} · {post.geohash || '—'} {post.aiReason ? `· ${post.aiReason}` : ''}</p>
        <div className="mt-2 flex gap-2">
          <Link to={`/posts/${post.id}`} className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium">Details</Link>
          {post.roadName && <Link to={`/road/${encodeURIComponent(post.roadName)}`} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">Timeline</Link>}
        </div>
      </div>
    </article>
  )
}
