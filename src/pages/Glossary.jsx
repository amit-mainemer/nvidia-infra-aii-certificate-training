import { useState, useMemo } from 'react'
import { glossary, glossaryCats } from '../data/glossary.js'

export default function Glossary() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return glossary
      .filter((g) => cat === 'All' || g.cat === cat)
      .filter((g) =>
        !needle ||
        g.term.toLowerCase().includes(needle) ||
        g.def.toLowerCase().includes(needle) ||
        (g.exam || '').toLowerCase().includes(needle)
      )
      .sort((a, b) => a.term.localeCompare(b.term))
  }, [q, cat])

  return (
    <div className="wrap">
      <span className="eyebrow">Reference</span>
      <h1 style={{ maxWidth: '20ch' }}>{glossary.length} terms, each with what it means for the exam.</h1>
      <p className="hero-sub" style={{ marginBottom: 22 }}>
        Every one of these is linked inside the lessons — hover or tap an underlined term to see this definition
        without leaving the page. Search here when you want to revise them all at once.
      </p>

      <input
        className="search"
        placeholder="Search terms, definitions and exam notes…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />

      <div className="chips">
        <button className={`chip ${cat === 'All' ? 'on' : ''}`} onClick={() => setCat('All')}>
          All ({glossary.length})
        </button>
        {glossaryCats.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
            {c} ({glossary.filter((g) => g.cat === c).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">No terms match “{q}”.</div>
      ) : (
        <div className="grid g2">
          {filtered.map((g) => (
            <div key={g.id} className="card gl-item">
              <div className="spread" style={{ alignItems: 'baseline', marginBottom: 2 }}>
                <h3>{g.term}</h3>
                <span className="pill" style={{ fontSize: '.66rem' }}>{g.cat}</span>
              </div>
              <p>{g.def}</p>
              {g.exam && <div className="gl-why"><b>On the exam:</b> {g.exam}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
