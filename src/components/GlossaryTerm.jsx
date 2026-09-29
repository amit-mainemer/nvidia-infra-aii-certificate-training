import { useState, useRef, useEffect, useCallback } from 'react'
import { glossaryById } from '../data/glossary.js'

/**
 * An inline glossary term. Opens on hover (pointer devices) and on
 * click/tap (everything). The popup is positioned in viewport coordinates
 * and clamped to stay on screen, so it works inside scrolled prose.
 */
export default function GlossaryTerm({ id, children }) {
  const entry = glossaryById[id]
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: -9999, left: 0, width: 340, bottom: 'auto', maxHeight: 400 })
  const [pinned, setPinned] = useState(false)
  // mirrored in a ref so the mouseleave handler never reads a stale value
  const pinnedRef = useRef(false)
  const ref = useRef(null)
  const popRef = useRef(null)
  const hoverTimer = useRef(null)

  /**
   * Position the popup without needing to measure it: anchor to the side of
   * the term with more room and cap its height to that space. Anchoring the
   * "above" case by `bottom` means the popup can grow upward and still never
   * overflow the viewport, whatever the definition's length.
   */
  const place = useCallback(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    const width = Math.min(340, vw - 28)

    let left = r.left + r.width / 2 - width / 2
    left = Math.max(14, Math.min(left, vw - width - 14))

    const below = vh - r.bottom - 20
    const above = r.top - 20

    setPos(
      below >= 250 || below >= above
        ? { left, width, top: r.bottom + 9, bottom: 'auto', maxHeight: Math.max(140, below) }
        : { left, width, top: 'auto', bottom: vh - r.top + 9, maxHeight: Math.max(140, above) }
    )
  }, [])

  useEffect(() => {
    if (!open) return
    const dismiss = () => { pinnedRef.current = false; setPinned(false); setOpen(false) }
    // ignore scrolling that happens inside the popup itself
    const onScroll = (e) => { if (!popRef.current?.contains(e.target)) dismiss() }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', dismiss)
    const onKey = (e) => e.key === 'Escape' && dismiss()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!entry) return <>{children}</>

  const show = () => { place(); setOpen(true) }
  const pin = (v) => { pinnedRef.current = v; setPinned(v) }
  const close = () => { pin(false); setOpen(false) }

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="term"
        aria-label={`Definition of ${entry.term}`}
        onClick={(e) => {
          e.stopPropagation()
          if (open && pinnedRef.current) close()
          else { show(); pin(true) }
        }}
        onMouseEnter={() => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(show, 120) }}
        onMouseLeave={() => { clearTimeout(hoverTimer.current); if (!pinnedRef.current) setOpen(false) }}
        onFocus={show}
        onBlur={() => { if (!pinnedRef.current) setOpen(false) }}
      >
        {children || entry.term}
      </button>

      {open && (
        <>
          {pinned && <div className="pop-scrim" onClick={close} />}
          <div
            ref={popRef}
            className="pop"
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, overflowY: 'auto' }}
            role="dialog"
          >
            <div className="pop-h">
              <span className="pop-t">{entry.term}</span>
              <button className="pop-x" onClick={close} aria-label="Close">×</button>
            </div>
            <p className="pop-d">{entry.def}</p>
            {entry.exam && (
              <div className="pop-why"><b>On the exam:</b> {entry.exam}</div>
            )}
            <div className="pop-tag"><span className="pill">{entry.cat}</span></div>
          </div>
        </>
      )}
    </>
  )
}
