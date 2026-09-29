import { useState } from 'react'
import { Link } from 'react-router-dom'
import { examBank } from '../data/examBank.js'
import { questionPool } from '../data/modules/index.js'
import { blueprint, domainById, exam, WEIGHT_SCALE } from '../data/exam.js'
import { useProgress } from '../lib/progress.js'
import Quiz from '../components/Quiz.jsx'
import { shuffle } from '../lib/shuffle.js'
import ScoreRing from '../components/ScoreRing.jsx'
import { examDayTips } from '../data/resources.js'

export default function MockExam() {
  const progress = useProgress()
  const [running, setRunning] = useState(null)

  function start(kind) {
    if (kind === 'full') {
      setRunning({ questions: examBank, minutes: 120, label: `Full mock — ${examBank.length} questions` })
    } else if (kind === 'short') {
      setRunning({ questions: shuffle(examBank).slice(0, 35), minutes: 60, label: 'Half exam — 35 questions' })
    } else {
      // everything: bank + module questions, deduplicated by id
      const all = [...examBank, ...questionPool]
      setRunning({ questions: shuffle(all).slice(0, 75), minutes: 120, label: 'Marathon — 75 questions from the full pool' })
    }
  }

  if (running) {
    return (
      <div className="wrap">
        <div className="center" style={{ marginBottom: 20 }}>
          <span className="eyebrow">Exam conditions</span>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', marginBottom: 4 }}>{running.label}</h1>
          <p className="muted tiny">
            No feedback until you submit. Flag anything you want to revisit and use the number palette to jump around.
          </p>
        </div>
        <Quiz
          key={running.label}
          questions={running.questions}
          mode="exam"
          minutes={running.minutes}
          passPct={75}
          onFinish={(r) => progress.saveExam({ ...r, label: running.label })}
        />
        <div className="center" style={{ marginTop: 24 }}>
          <button className="btn btn-quiet btn-sm" onClick={() => setRunning(null)}>Leave exam</button>
        </div>
      </div>
    )
  }

  const history = [...progress.exams].reverse()
  const best = progress.exams.length ? Math.max(...progress.exams.map((e) => e.pct)) : null

  // Weakest domains across all attempts
  const agg = {}
  progress.exams.forEach((e) => {
    Object.entries(e.byDomain || {}).forEach(([d, v]) => {
      agg[d] ||= { right: 0, total: 0 }
      agg[d].right += v.right
      agg[d].total += v.total
    })
  })
  const weak = Object.entries(agg)
    .filter(([, v]) => v.total >= 3)
    .map(([d, v]) => ({ d, pct: Math.round((v.right / v.total) * 100), ...v }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)

  return (
    <div className="wrap">
      <span className="eyebrow">Timed assessment</span>
      <h1 style={{ maxWidth: '18ch' }}>Sit a mock under exam conditions.</h1>
      <p className="hero-sub" style={{ marginBottom: 28 }}>
        The real {exam.code} is {exam.questions} scenario-heavy questions in {exam.duration}, remotely proctored,
        with an unpublished pass mark — aim for 75%+ here before booking. These {examBank.length} questions are separate from the module quizzes,
        so a mock is a genuine test rather than a recall exercise.
      </p>

      <div className="grid g3" style={{ marginBottom: 30 }}>
        <ExamOption
          title="Full mock exam"
          meta={`${examBank.length} questions · 120 min`}
          desc={`Blueprint-weighted across all ${blueprint.length} domains, matching the real exam length and clock.`}
          cta="Start full mock"
          primary
          onClick={() => start('full')}
        />
        <ExamOption
          title="Half exam"
          meta="35 questions · 60 min"
          desc="A shorter check-in when you have an hour. Randomly drawn from the same bank."
          cta="Start half exam"
          onClick={() => start('short')}
        />
        <ExamOption
          title="Marathon"
          meta="75 questions · 120 min"
          desc="Draws from the mock bank and every module quiz, at the real exam's maximum length of 75 questions."
          cta="Start marathon"
          onClick={() => start('marathon')}
        />
      </div>

      {progress.exams.length > 0 && (
        <div className="grid g2" style={{ marginBottom: 30 }}>
          <div className="card">
            <div className="spread" style={{ marginBottom: 12 }}>
              <div>
                <span className="eyebrow">Best result</span>
                <h3 style={{ margin: '4px 0 0' }}>{progress.exams.length} attempt{progress.exams.length > 1 ? 's' : ''}</h3>
              </div>
              <ScoreRing pct={best} size={82} stroke={8} color={best >= 75 ? 'var(--ok)' : 'var(--warn)'} />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {history.slice(0, 5).map((e, i) => (
                <div key={i} className="lesson-item" style={{ cursor: 'default' }}>
                  <span className={`li-idx`} style={e.pct >= 75 ? { background: 'var(--nv)', color: 'var(--on-accent)', borderColor: 'var(--nv)' } : {}}>
                    {e.pct >= 75 ? '✓' : '·'}
                  </span>
                  <span className="li-t" style={{ fontWeight: 500 }}>{e.label || 'Mock exam'}</span>
                  <span className="li-time" style={{ color: e.pct >= 75 ? 'var(--ok)' : 'var(--warn)', fontWeight: 700 }}>
                    {e.score}/{e.total} · {e.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <span className="eyebrow">Where to study next</span>
            <h3 style={{ margin: '4px 0 12px' }}>Weakest domains across all attempts</h3>
            {weak.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {weak.map((w) => (
                  <Link key={w.d} to={`/module/${w.d}`} className="lesson-item">
                    <span className="li-idx" style={{ borderColor: domainById[w.d].color, color: domainById[w.d].color }}>
                      {domainById[w.d].n}
                    </span>
                    <span className="li-t">{domainById[w.d].name}</span>
                    <span className="li-time" style={{ color: w.pct >= 70 ? 'var(--ok)' : 'var(--bad)', fontWeight: 700 }}>{w.pct}%</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted tiny">Complete a full mock to see a domain breakdown.</p>
            )}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: '1.15rem' }}>How the questions are weighted</h2>
      <div className="card" style={{ marginBottom: 30 }}>
        {blueprint.map((d) => {
          const n = examBank.filter((q) => q.domain === d.id).length
          return (
            <div className="bp-row" key={d.id}>
              <div className="bp-name"><i style={{ background: d.color }} /><b>{d.name}</b></div>
              <div className="bp-pct">{n} q · {d.weight}%</div>
              <div className="bp-track"><i style={{ width: `${d.weight * WEIGHT_SCALE}%`, background: d.color }} /></div>
            </div>
          )
        })}
      </div>

      <h2 style={{ fontSize: '1.15rem' }}>Exam-day technique</h2>
      <div className="card">
        <ul style={{ paddingLeft: '1.2em', margin: 0 }}>
          {examDayTips.map((t, i) => (
            <li key={i} style={{ marginBottom: '.6em', color: 'var(--fg-2)' }}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ExamOption({ title, meta, desc, cta, onClick, primary }) {
  return (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>{title}</h3>
      <span className="pill pill-nv" style={{ alignSelf: 'flex-start', marginBottom: 10 }}>{meta}</span>
      <p className="muted tiny" style={{ flex: 1, lineHeight: 1.6 }}>{desc}</p>
      <button className={`btn ${primary ? 'btn-primary' : 'btn-ghost'} btn-block`} onClick={onClick}>{cta}</button>
    </div>
  )
}
