import { useState, useMemo, useEffect, useRef } from 'react'
import RichText from './RichText.jsx'
import { shuffle, shuffleOptions } from '../lib/shuffle.js'
import { domainById } from '../data/exam.js'
import ScoreRing from './ScoreRing.jsx'

export const KEYS = ['A', 'B', 'C', 'D', 'E']

/**
 * Two modes:
 *   study — immediate feedback with the explanation after each answer
 *   exam  — no feedback until the end, timer, flagging and a question palette
 */
export default function Quiz({
  questions,
  mode = 'study',
  minutes,
  title,
  onFinish,
  passPct = 75,
  randomise = true,
}) {
  const prepared = useMemo(() => {
    const qs = randomise ? shuffle(questions) : questions
    return qs.map((q) => (randomise ? shuffleOptions(q) : q))
  }, [questions, randomise])

  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState({})     // index -> chosen option index
  const [revealed, setRevealed] = useState({})   // study mode
  const [flags, setFlags] = useState({})
  const [done, setDone] = useState(false)
  const [left, setLeft] = useState(minutes ? minutes * 60 : null)
  const finishedRef = useRef(false)
  const topRef = useRef(null)

  const q = prepared[i]
  const chosen = answers[i]
  const isRevealed = mode === 'study' && revealed[i]

  const score = useMemo(
    () => prepared.reduce((n, qq, idx) => n + (answers[idx] === qq.a ? 1 : 0), 0),
    [answers, prepared]
  )

  /* timer -------------------------------------------------------- */
  useEffect(() => {
    if (!minutes || done) return
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) { clearInterval(t); finish(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes, done])

  function finish() {
    if (finishedRef.current) return
    finishedRef.current = true
    setDone(true)
    const byDomain = {}
    prepared.forEach((qq, idx) => {
      const d = qq.domain || 'other'
      byDomain[d] ||= { right: 0, total: 0 }
      byDomain[d].total++
      if (answers[idx] === qq.a) byDomain[d].right++
    })
    const s = prepared.reduce((n, qq, idx) => n + (answers[idx] === qq.a ? 1 : 0), 0)
    onFinish?.({ score: s, total: prepared.length, pct: Math.round((s / prepared.length) * 100), byDomain })
  }

  function choose(k) {
    if (mode === 'study' && isRevealed) return
    setAnswers((a) => ({ ...a, [i]: k }))
    if (mode === 'study') setRevealed((r) => ({ ...r, [i]: true }))
  }

  function go(n) {
    setI(n)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const answeredCount = Object.keys(answers).length

  /* ---------------- results ---------------- */
  if (done) {
    const pct = Math.round((score / prepared.length) * 100)
    const passed = pct >= passPct
    const byDomain = {}
    prepared.forEach((qq, idx) => {
      const d = qq.domain || 'other'
      byDomain[d] ||= { right: 0, total: 0 }
      byDomain[d].total++
      if (answers[idx] === qq.a) byDomain[d].right++
    })

    return (
      <div className="quiz-shell" ref={topRef}>
        <div className="q-card">
          <div className="score-hero">
            <ScoreRing pct={pct} size={168} color={passed ? 'var(--ok)' : 'var(--warn)'} />
          </div>
          <div className="center" style={{ marginBottom: 24 }}>
            <div className={`pill ${passed ? 'pill-ok' : 'pill-warn'}`} style={{ marginBottom: 10 }}>
              {passed ? 'Above the pass mark' : 'Below the pass mark'}
            </div>
            <h2 style={{ margin: '4px 0' }}>{score} / {prepared.length} correct</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              NVIDIA does not publish the pass mark — aim for {passPct}%+ here. Treat anything under 80% in a domain as a signal to re-read it.
            </p>
          </div>

          {Object.keys(byDomain).length > 1 && (
            <>
              <h3 style={{ fontSize: '.8rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>
                By exam domain
              </h3>
              <div style={{ marginBottom: 22 }}>
                {Object.entries(byDomain)
                  .sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total)
                  .map(([d, v]) => {
                    const dm = domainById[d]
                    const p = Math.round((v.right / v.total) * 100)
                    return (
                      <div className="bp-row" key={d}>
                        <div className="bp-name">
                          <i style={{ background: dm?.color || 'var(--fg-3)' }} />
                          <b>{dm?.name || d}</b>
                        </div>
                        <div className="bp-pct" style={{ color: p >= 70 ? 'var(--ok)' : 'var(--bad)' }}>
                          {v.right}/{v.total}
                        </div>
                        <div className="bp-track">
                          <i style={{ width: `${p}%`, background: dm?.color || 'var(--fg-3)' }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </>
          )}

          <button
            className="btn btn-ghost btn-block"
            onClick={() => {
              finishedRef.current = false
              setDone(false); setI(0); setAnswers({}); setRevealed({}); setFlags({})
              setLeft(minutes ? minutes * 60 : null)
              topRef.current?.scrollIntoView({ block: 'start' })
            }}
          >Retake</button>
        </div>

        <h3 style={{ marginTop: 34 }}>Review every question</h3>
        <p className="muted tiny">The distractor analysis is where most of the learning is — read it even for questions you answered correctly.</p>
        {prepared.map((qq, idx) => (
          <div className="q-card" key={idx} style={{ marginBottom: 14 }}>
            <div className="q-bar">
              <span className="q-count">Q{idx + 1}</span>
              <span className={`pill ${answers[idx] === qq.a ? 'pill-ok' : 'pill-bad'}`}>
                {answers[idx] === qq.a ? 'Correct' : answers[idx] === undefined ? 'Skipped' : 'Incorrect'}
              </span>
              {qq.domain && <span className="pill">{domainById[qq.domain]?.name}</span>}
            </div>
            {qq.scenario && <div className="q-scenario"><RichText>{qq.scenario}</RichText></div>}
            <div className="q-text"><RichText>{qq.q}</RichText></div>
            <div className="opts">
              {qq.opts.map((o, k) => (
                <div
                  key={k}
                  className={`opt ${k === qq.a ? 'right' : answers[idx] === k ? 'wrong' : ''}`}
                >
                  <span className="opt-k">{KEYS[k]}</span>
                  <span><RichText>{o}</RichText></span>
                </div>
              ))}
            </div>
            <Explanation q={qq} />
          </div>
        ))}
      </div>
    )
  }

  /* ---------------- question view ---------------- */
  const mm = left != null ? String(Math.floor(left / 60)).padStart(2, '0') : null
  const ss = left != null ? String(left % 60).padStart(2, '0') : null

  return (
    <div className="quiz-shell" ref={topRef}>
      <div className="q-bar">
        <span className="q-count">Question {i + 1} of {prepared.length}</span>
        {q.domain && <span className="pill">{domainById[q.domain]?.name}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {mode === 'exam' && (
            <button
              className={`btn btn-sm ${flags[i] ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFlags((f) => ({ ...f, [i]: !f[i] }))}
            >{flags[i] ? '★ Flagged' : '☆ Flag'}</button>
          )}
          {left != null && (
            <span className={`timer ${left < 300 ? 'low' : ''}`}>{mm}:{ss}</span>
          )}
        </div>
      </div>

      <div className="bar" style={{ marginBottom: 20 }}>
        <i style={{ width: `${((i + 1) / prepared.length) * 100}%` }} />
      </div>

      <div className="q-card">
        {q.scenario && <div className="q-scenario"><RichText>{q.scenario}</RichText></div>}
        <div className="q-text"><RichText>{q.q}</RichText></div>

        <div className="opts">
          {q.opts.map((o, k) => {
            let cls = ''
            if (isRevealed) {
              if (k === q.a) cls = 'right'
              else if (chosen === k) cls = 'wrong'
            } else if (chosen === k) cls = 'sel'
            return (
              <button key={k} className={`opt ${cls}`} onClick={() => choose(k)} disabled={isRevealed}>
                <span className="opt-k">{KEYS[k]}</span>
                <span><RichText>{o}</RichText></span>
              </button>
            )
          })}
        </div>

        {isRevealed && <Explanation q={q} />}

        <div className="q-nav">
          <button className="btn btn-ghost" disabled={i === 0} onClick={() => go(i - 1)}>← Back</button>
          {i < prepared.length - 1 ? (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={mode === 'study' && !isRevealed}
              onClick={() => go(i + 1)}
            >Next →</button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={mode === 'study' && !isRevealed}
              onClick={finish}
            >Finish{mode === 'exam' ? ` (${answeredCount}/${prepared.length} answered)` : ''}</button>
          )}
        </div>
      </div>

      {mode === 'exam' && (
        <>
          <div className="palette">
            {prepared.map((_, k) => (
              <button
                key={k}
                className={`pal ${k === i ? 'now' : ''} ${answers[k] !== undefined ? 'answered' : ''} ${flags[k] ? 'flagged' : ''}`}
                onClick={() => go(k)}
              >{k + 1}</button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
            <span className="tiny dim">{answeredCount} answered · {Object.values(flags).filter(Boolean).length} flagged</span>
            <button className="btn btn-ghost btn-sm" onClick={finish}>Submit exam</button>
          </div>
        </>
      )}
    </div>
  )
}

export function Explanation({ q }) {
  return (
    <div className="explain">
      <h4 style={{ color: 'var(--ok)' }}>Why {KEYS[q.a]} is correct</h4>
      <p><RichText>{q.why}</RichText></p>
      {q.distract && (
        <div className="distract">
          <b>Why the others fail — </b><RichText>{q.distract}</RichText>
        </div>
      )}
    </div>
  )
}
