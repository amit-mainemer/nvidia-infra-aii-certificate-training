export default function ScoreRing({ pct, size = 120, stroke = 11, color = 'var(--nv)', label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c
  return (
    <div className="ring-wrap" style={{ position: 'relative', width: size, height: size }}>
      <svg className="ring" width={size} height={size}>
        <circle className="bgc" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="fgc" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
          stroke={color} strokeDasharray={c} strokeDashoffset={off}
        />
      </svg>
      <div className="ring-label">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: size / 4.2, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1 }}>{pct}%</div>
          {label && <div style={{ fontSize: '.68rem', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 700, marginTop: 4 }}>{label}</div>}
        </div>
      </div>
    </div>
  )
}
