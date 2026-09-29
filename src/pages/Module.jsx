import { Link, useParams, Navigate } from 'react-router-dom'
import { moduleById } from '../data/modules/index.js'
import { blueprint } from '../data/exam.js'
import { useProgress, moduleProgress } from '../lib/progress.js'
import ModuleIntroVideo from '../components/ModuleIntroVideo.jsx'
import { lessonObjectives } from '../data/objectives.js'

export default function Module() {
  const { moduleId } = useParams()
  const mod = moduleById[moduleId]
  const progress = useProgress()

  if (!mod) return <Navigate to="/roadmap" replace />

  const p = moduleProgress(progress, mod)
  const d = blueprint.find((b) => b.id === mod.domain)
  const quiz = progress.quizzes[mod.id]

  return (
    <div className="wrap">
      <div className="crumb">
        <Link to="/roadmap">Roadmap</Link> <span>/</span> <span>Module {mod.n}</span>
      </div>

      <span className="eyebrow" style={{ color: d.color }}>Domain {mod.n} · {mod.weight}% of the exam</span>
      <h1>{mod.title}</h1>
      <p className="hero-sub">{mod.blurb}</p>

      <div style={{ marginTop: 24 }}><ModuleIntroVideo mod={mod} /></div>

      <div className="card" style={{ margin: '26px 0 30px' }}>
        <div className="spread" style={{ marginBottom: 12 }}>
          <strong>{p.done} / {p.total} lessons complete</strong>
          <span className="row">
            <span className="pill">{mod.hours}</span>
            {quiz && <span className={`pill ${quiz.score / quiz.total >= 0.8 ? 'pill-ok' : 'pill-warn'}`}>
              Best quiz {Math.round((quiz.score / quiz.total) * 100)}%
            </span>}
          </span>
        </div>
        <div className="bar"><i style={{ width: `${p.pct}%`, background: d.color }} /></div>
      </div>

      <h2 style={{ fontSize: '1.15rem' }}>Lessons</h2>
      <div style={{ display: 'grid', gap: 8, marginBottom: 30 }}>
        {mod.lessons.map((l, i) => {
          const isDone = !!progress.lessons[`${mod.id}/${l.id}`]
          const check = progress.checks?.[`${mod.id}/${l.id}`]
          return (
            <Link key={l.id} to={`/module/${mod.id}/${l.id}`} className={`lesson-item ${isDone ? 'done' : ''}`}>
              <span className="li-idx">{isDone ? '✓' : i + 1}</span>
              <span className="li-t">
                {l.title}
                {lessonObjectives[`${mod.id}/${l.id}`] && (
                  <span className="li-obj">Objectives {lessonObjectives[`${mod.id}/${l.id}`].join(' · ')}</span>
                )}
              </span>
              <span className="li-time">
                {check ? <span className={check.score / check.total >= 0.7 ? 'ok' : 'warn'}>{check.score}/{check.total}</span> : `${l.minutes} min`}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="card">
        <div className="spread">
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>Module quiz</h3>
            <p className="muted tiny" style={{ margin: 0 }}>
              {mod.quiz.length} exam-style questions with full explanations and distractor analysis.
            </p>
          </div>
          <Link className="btn btn-primary" to={`/practice/${mod.id}`}>
            {quiz ? 'Retake quiz' : 'Start quiz'} →
          </Link>
        </div>
      </div>

      <div className="row" style={{ marginTop: 26, justifyContent: 'space-between' }}>
        {mod.n > 1
          ? <Link className="btn btn-ghost" to={`/module/${Object.values(moduleById).find((m) => m.n === mod.n - 1).id}`}>← Module {mod.n - 1}</Link>
          : <span />}
        {mod.n < Object.keys(moduleById).length && (
          <Link className="btn btn-ghost" to={`/module/${Object.values(moduleById).find((m) => m.n === mod.n + 1).id}`}>Module {mod.n + 1} →</Link>
        )}
      </div>
    </div>
  )
}
