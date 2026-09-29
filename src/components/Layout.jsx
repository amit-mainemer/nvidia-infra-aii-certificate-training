import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useTheme, useProgress } from '../lib/progress.js'
import { totalLessons } from '../data/modules/index.js'

/* 24×24 stroke icons, drawn with currentColor. */
const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
}

export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

const LINKS = [
  { to: '/',          label: 'Overview',  icon: 'home', end: true },
  { to: '/roadmap',   label: 'Roadmap',   icon: 'map' },
  { to: '/practice',  label: 'Practice',  icon: 'target' },
  { to: '/exam',      label: 'Mock exam', icon: 'clock' },
  { to: '/glossary',  label: 'Glossary',  icon: 'book' },
  { to: '/resources', label: 'Resources', icon: 'link' },
]

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)
  const [theme, toggleTheme] = useTheme()
  const progress = useProgress()
  const done = Object.keys(progress.lessons).length
  const loc = useLocation()

  useEffect(() => { setOpen(false) }, [loc.pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="shell">
      <header className="nav">
        <div className="wrap">
          <Link to="/" className="brand">
            <span className="brand-mark">AI</span>
            <span className="brand-name">NCP-AII <span>Academy</span></span>
          </Link>

          <nav className="nav-links">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav-right">
            <button className="icon-btn theme-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle light / dark">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <button className="icon-btn burger" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
              <Icon name="menu" size={22} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <>
          <div className="drawer-scrim" onClick={() => setOpen(false)} />
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="drawer-head">
              <Link to="/" className="brand">
                <span className="brand-mark">AI</span>
                <span className="brand-name">NCP-AII <span>Academy</span></span>
              </Link>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu">
                <Icon name="close" size={22} />
              </button>
            </div>

            <nav className="drawer-links">
              {LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}>
                  <Icon name={l.icon} /> {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="drawer-foot">
              <div className="drawer-progress">
                <div className="spread tiny">
                  <span className="muted">Your progress</span>
                  <b>{done} / {totalLessons} lessons</b>
                </div>
                <div className="bar"><i style={{ width: `${(done / totalLessons) * 100}%` }} /></div>
              </div>
              <button className="drawer-link drawer-theme" onClick={toggleTheme}>
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="page">{children}</main>

      <footer className="foot">
        <div className="wrap">
          <p style={{ marginBottom: 6 }}>
            An independent, community-built study companion for the <b>NVIDIA-Certified Professional: AI Infrastructure (NCP-AII)</b> exam.
            Not affiliated with or endorsed by NVIDIA.
          </p>
          <p style={{ margin: 0 }}>
            Always verify the current blueprint on the{' '}
            <a href="https://www.nvidia.com/en-eu/learn/certification/ai-infrastructure-professional/" target="_blank" rel="noreferrer">official exam page</a>
            {' '}— domains and weights change between revisions. Progress is stored only in your own browser.
          </p>
        </div>
      </footer>
    </div>
  )
}
