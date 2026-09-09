import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

export default function AiSummary({ roadName, bounds }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const qs = new URLSearchParams()
        if (roadName) qs.set('roadName', roadName)
        if (bounds) qs.set('bounds', bounds)
        const r = await fetch(`${api}/api/ai/summarize?${qs}`)
        const j = await r.json()
        if (!cancelled) setData(j)
      } catch {
        if (!cancelled) setData(null)
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [roadName, bounds])

  if (loading) return <div className="rounded-xl border bg-blue-50 px-3 py-2 text-xs text-blue-800">AI summarizing…</div>
  if (!data?.summary) return null
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">AI Summary · {data.count} reports{data.model ? ` · ${data.model}` : ''}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{data.summary}</p>
    </div>
  )
}
