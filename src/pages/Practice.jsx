import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { modules, moduleById, questionPool } from '../data/modules/index.js'
import { blueprint } from '../data/exam.js'
import { useProgress } from '../lib/progress.js'
import Quiz from '../components/Quiz.jsx'
import { shuffle } from '../lib/shuffle.js'

export default function Practice() {
  const { moduleId } = useParams()
  const progress = useProgress()
  const nav = useNavigate()
  const [mixed, setMixed] = useState(null)

  const mod = moduleId ? moduleById[moduleId] : null

  const mixedQuestions = useMemo(
    () => (mixed ? shuffle(questionPool).slice(0, mixed) : null),
    [mixed]
  )

  if (mod) {
    const d = blueprint.find((b) => b.id === mod.domain)
    return (
      <div className="wrap">
        <div className="crumb">
          <Link to="/practice">Practice</Link> <span>/</span>
          <Link to={`/module/${mod.id}`}>{mod.title}</Link>
        </div>
        <div className="center" style={{ marginBottom: 22 }}>
          <span className="eyebrow" style={{ color: d.color }}>Module {mod.n} quiz</span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)' }}>{mod.title}</h1>
          <p className="muted tiny">Answer, then read the explanation before moving on. Your best score is saved.</p>
        </div>
        <Quiz
          key={mod.id}
          questions={mod.quiz}
          mode="study"
          onFinish={(r) => progress.saveQuiz(mod.id, r.score, r.total)}
        />
      </div>
    )
  }

  if (mixedQuestions) {
    return (
      <div className="wrap">
        <div className="center" style={{ marginBottom: 22 }}>
          <span className="eyebrow">Mixed practice</span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)' }}>{mixedQuestions.length} questions, all domains</h1>
          <button className="btn btn-quiet btn-sm" onClick={() => setMixed(null)}>← Back to practice menu</button>
        </div>
        <Quiz key={`mixed-${mixedQuestions.length}`} questions={mixedQuestions} mode="study" />
      </div>
    )
  }

  return (
    <div className="wrap">
      <span className="eyebrow">Practice</span>
      <h1 style={{ maxWidth: '18ch' }}>Drill by domain, or mix everything.</h1>
      <p className="hero-sub" style={{ marginBottom: 28 }}>
        Practice mode gives you the answer and a full explanation immediately, including why each wrong option is wrong.
        Use the timed <Link to="/exam" style={{ color: 'var(--nv)' }}>mock exam</Link> when you want a genuine assessment.
      </p>

      <div className="card" style={{ marginBottom: 28 }}>
        <div className="spread">
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>Mixed practice</h3>
            <p className="muted tiny" style={{ margin: 0 }}>Random questions drawn from every module, in study mode.</p>
          </div>
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={() => setMixed(15)}>15 questions</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setMixed(30)}>30 questions</button>
            <button className="btn btn-primary btn-sm" onClick={() => setMixed(questionPool.length)}>All {questionPool.length}</button>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.15rem' }}>By module</h2>
      <div className="grid g2">
        {modules.map((m) => {
          const q = progress.quizzes[m.id]
          const d = blueprint.find((b) => b.id === m.domain)
          const pct = q ? Math.round((q.score / q.total) * 100) : null
          return (
            <button key={m.id} className="card card-hover" style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => nav(`/practice/${m.id}`)}>
              <div className="mod-head">
                <div className="mod-idx" style={{ borderColor: d.color, color: d.color }}>{String(m.n).padStart(2, '0')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mod-title">{m.title}</div>
                  <div className="mod-meta">
                    <span className="pill">{m.quiz.length} questions</span>
                    <span className="pill" style={{ color: d.color, borderColor: d.color }}>{m.weight}%</span>
                    {pct !== null && (
                      <span className={`pill ${pct >= 80 ? 'pill-ok' : pct >= 60 ? 'pill-warn' : 'pill-bad'}`}>Best {pct}%</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
