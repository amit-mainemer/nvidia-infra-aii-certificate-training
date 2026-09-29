import { Link } from 'react-router-dom'
import { modules, totalLessons } from '../data/modules/index.js'
import { blueprint } from '../data/exam.js'
import { useProgress, moduleProgress } from '../lib/progress.js'
import { studyPlans } from '../data/resources.js'
import { useState } from 'react'
import ModuleIntroVideo from '../components/ModuleIntroVideo.jsx'

export default function Roadmap() {
  const progress = useProgress()
  const [plan, setPlan] = useState(0)
  const done = Object.keys(progress.lessons).length

  const firstIncomplete = modules.findIndex((m) => moduleProgress(progress, m).pct < 100)

  return (
    <div className="wrap">
      <span className="eyebrow">Learning roadmap</span>
      <h1 style={{ maxWidth: '20ch' }}>{modules.length} modules, one per exam domain.</h1>
      <p className="hero-sub" style={{ marginBottom: 26 }}>
        The modules follow the official NCP-AII study guide objectives in the order you would build a cluster: rack and
        bring up the hardware, configure the physical layer, install the control plane, verify, then troubleshoot. Lesson
        length follows the domain weights — Modules 1 and 4 alone are almost two thirds of the exam.
      </p>

      <div className="card" style={{ marginBottom: 30 }}>
        <div className="spread" style={{ marginBottom: 12 }}>
          <strong>{done} / {totalLessons} lessons complete</strong>
          <span className="tiny dim">{Math.round((done / totalLessons) * 100)}%</span>
        </div>
        <div className="bar"><i style={{ width: `${(done / totalLessons) * 100}%` }} /></div>
      </div>

      <div className="track">
        {modules.map((m, i) => {
          const p = moduleProgress(progress, m)
          const d = blueprint.find((b) => b.id === m.domain)
          const quiz = progress.quizzes[m.id]
          return (
            <div key={m.id} className={`node ${p.pct === 100 ? 'done' : ''} ${i === firstIncomplete ? 'active' : ''}`}>
              <div className="card mod-card">
                <div className="mod-head">
                  <div className="mod-idx" style={p.pct === 100 ? { background: d.color, color: '#041018', borderColor: d.color } : undefined}>
                    {p.pct === 100 ? '✓' : String(m.n).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/module/${m.id}`} className="mod-title" style={{ display: 'block' }}>{m.title}</Link>
                    <div className="tiny muted" style={{ lineHeight: 1.55 }}>{m.blurb}</div>
                    <div className="mod-meta">
                      <span className="pill" style={{ color: d.color, borderColor: d.color }}>{m.weight}%</span>
                      <span className="pill">{m.hours}</span>
                      <span className="pill">{m.lessons.length} lessons</span>
                      {quiz && (
                        <span className={`pill ${quiz.score / quiz.total >= 0.8 ? 'pill-ok' : 'pill-warn'}`}>
                          Quiz {Math.round((quiz.score / quiz.total) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <ModuleIntroVideo key={m.id} mod={m} compact />

                <div style={{ marginTop: 14 }}>
                  <div className="bar" style={{ marginBottom: 12 }}><i style={{ width: `${p.pct}%` }} /></div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {m.lessons.map((l, j) => {
                      const isDone = !!progress.lessons[`${m.id}/${l.id}`]
                      return (
                        <Link key={l.id} to={`/module/${m.id}/${l.id}`} className={`lesson-item ${isDone ? 'done' : ''}`}>
                          <span className="li-idx">{isDone ? '✓' : j + 1}</span>
                          <span className="li-t">{l.title}</span>
                          <span className="li-time">{l.minutes} min</span>
                        </Link>
                      )
                    })}
                    <Link to={`/practice/${m.id}`} className="lesson-item" style={{ borderStyle: 'dashed' }}>
                      <span className="li-idx">◑</span>
                      <span className="li-t">Module quiz — {m.quiz.length} questions</span>
                      <span className="li-time">~{Math.ceil(m.quiz.length * 1.5)} min</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <section style={{ marginTop: 46 }}>
        <h2>Pick a study plan</h2>
        <div className="chips">
          {studyPlans.map((p, i) => (
            <button key={p.name} className={`chip ${plan === i ? 'on' : ''}`} onClick={() => setPlan(i)}>{p.name}</button>
          ))}
        </div>
        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="pill pill-nv">{studyPlans[plan].per}</span>
            <span className="muted tiny">{studyPlans[plan].for}</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {studyPlans[plan].weeks.map((w, i) => (
              <div key={i} className="lesson-item" style={{ cursor: 'default' }}>
                <span className="li-idx">{i + 1}</span>
                <span className="li-t" style={{ fontWeight: 500 }}>{w}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
