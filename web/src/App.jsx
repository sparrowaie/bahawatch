import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Feed from './pages/Feed.jsx'
import MapView from './pages/MapView.jsx'
import CreatePost from './pages/CreatePost.jsx'
import Detail from './pages/Detail.jsx'
import Timeline from './pages/Timeline.jsx'
import BottomNav from './components/BottomNav.jsx'

function Header() {
  const loc = useLocation()
  const isPost = loc.pathname === '/post'
  return (
    <header className="sticky top-0 z-20 border-b bg-white">
      <div className="mx-auto flex max-w-[1024px] items-center justify-between px-3 py-2 sm:px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">B</span>
          <span className="text-sm font-bold tracking-tight">BAHAWATCH</span>
          <span className="hidden text-xs font-normal text-slate-500 sm:inline">· Community Flood & Road Reports</span>
        </Link>
        <div className="hidden items-center gap-2 sm:flex">
          <Link to="/" className="rounded-full border px-3 py-1 text-xs">Feed</Link>
          <Link to="/map" className="rounded-full border px-3 py-1 text-xs">Map</Link>
          <Link to="/post" className={`rounded-full px-3 py-1 text-xs font-medium ${isPost ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>Post Report</Link>
          <a href="/admin" target="_blank" rel="noreferrer" className="rounded-full border bg-slate-50 px-3 py-1 text-xs">Admin →</a>
        </div>
        <span className="text-[11px] text-slate-400 sm:hidden">Recent · Verified · Timeline</span>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/post" element={<CreatePost />} />
          <Route path="/posts/:id" element={<Detail />} />
          <Route path="/road/:roadName" element={<Timeline />} />
          <Route path="*" element={<div className="mx-auto max-w-[640px] p-8 text-center text-sm">Not found — <Link to="/" className="text-blue-600">go to feed</Link></div>} />
        </Routes>
      </main>
      <BottomNav />
      <div className="pointer-events-none fixed inset-x-0 bottom-[60px] flex justify-center sm:hidden">
        <span className="rounded-full border bg-white px-3 py-1 text-[11px] text-slate-500 shadow">Mobile-first · works on desktop too</span>
      </div>
    </div>
  )
}
