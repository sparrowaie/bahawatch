import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Feed', icon: '▦' },
  { to: '/map', label: 'Map', icon: '◎' },
  { to: '/post', label: 'Post', icon: '＋', primary: true },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-[640px] items-center justify-around px-2 py-1.5">
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-xl px-5 py-1.5 text-xs font-medium transition ${t.primary ? 'bg-blue-600 text-white shadow' : ''} ${!t.primary && isActive ? 'text-blue-600 bg-blue-50' : ''} ${!t.primary && !isActive ? 'text-slate-500' : ''}`}>
            <span className="text-[18px] leading-none">{t.icon}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-white" />
    </nav>
  )
}
