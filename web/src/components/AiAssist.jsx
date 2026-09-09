import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api.js'

const QUICK = [
  "What's the condition of Burgos St.?",
  "Is Jalandoni passable?",
  "Summarize recent reports",
  "How do I post a report?",
  "Safety tips for reporting?",
]

export default function AiAssist({ inline = false, roadName = null }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([
    { role: 'assistant', content: "Hi! I'm BAHAWATCH AI Assist (opencode ai). Ask about any road — e.g., 'What's the condition of Burgos St.?' — or tap a quick question." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [msgs, open])

  async function send(text) {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const r = await fetch(`${api}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...msgs.filter(x => x.role !== 'assistant' || !x.content.startsWith('Hi!')), { role: 'user', content: q }].slice(-8).map(m => ({ role: m.role, content: m.content })), roadName }),
      })
      const j = await r.json()
      setMsgs(m => [...m, { role: 'assistant', content: j.reply || j.error || 'No reply' }])
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', content: `Offline — try again. (${e.message})` }])
    } finally { setLoading(false) }
  }

  const panel = (
    <div className={`flex flex-col rounded-2xl border bg-white shadow-xl ${inline ? 'h-[420px]' : 'h-[min(68vh,520px)] w-[min(92vw,380px)]'}`}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">AI</span>
          <div>
            <p className="text-sm font-semibold leading-none">BAHAWATCH AI Assist</p>
            <p className="text-[11px] text-slate-500">opencode ai · gpt-4o-mini · heuristic fallback</p>
          </div>
        </div>
        {!inline && <button onClick={() => setOpen(false)} className="rounded-full border px-2.5 py-1 text-xs">✕</button>}
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-auto px-3 py-3">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
            <span className="whitespace-pre-wrap break-words">{m.content}</span>
          </div>
        ))}
        {loading && <div className="w-fit rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-500">AI thinking…</div>}
      </div>

      <div className="border-t p-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)} className="rounded-full border bg-slate-50 px-2.5 py-1 text-[11px] hover:bg-slate-100">{q}</button>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); send() }} className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about a road or condition…" className="flex-1 rounded-full border px-3 py-2 text-sm outline-none focus:border-blue-400" />
          <button type="submit" disabled={loading || !input.trim()} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300">Send</button>
        </form>
        <p className="mt-1 text-center text-[11px] text-slate-400">Shows recent reports + freshness. Never replaces official advisories.</p>
      </div>
    </div>
  )

  if (inline) return panel

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-[72px] right-3 z-30 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 sm:bottom-6 sm:right-6">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-600">AI</span>
          AI Assist
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-end bg-black/20 p-3 sm:items-end sm:justify-end" onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full sm:w-auto">
            {panel}
          </div>
        </div>
      )}
    </>
  )
}
