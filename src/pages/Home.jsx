import { Link } from 'react-router-dom'
import { exam, blueprint } from '../data/exam.js'
import { modules, totalLessons, totalQuizQuestions, totalMinutes } from '../data/modules/index.js'
import { examBank } from '../data/examBank.js'
import { glossary } from '../data/glossary.js'
import { useProgress, moduleProgress } from '../lib/progress.js'
import BlueprintChart from '../components/BlueprintChart.jsx'
import ScoreRing from '../components/ScoreRing.jsx'

export default function Home() {
  const progress = useProgress()
  const doneCount = Object.keys(progress.lessons).length
  const pct = Math.round((doneCount / totalLessons) * 100)
  const lastExam = progress.exams[progress.exams.length - 1]

  const next =
    progress.lastSeen ||
    (() => {
      for (const m of modules) {
        const l = m.lessons.find((x) => !progress.lessons[`${m.id}/${x.id}`])
        if (l) return { moduleId: m.id, lessonId: l.id }
      }
      return { moduleId: modules[0].id, lessonId: modules[0].lessons[0].id }
    })()

  return (
    <>
      <section className="wrap hero">
        <span className="eyebrow">NVIDIA-Certified Professional · {exam.code}</span>
        <h1>Everything you need to pass the <em>AI Infrastructure</em> certification.</h1>
        <p className="hero-sub">
          A complete, blueprint-aligned course: {totalLessons} written lessons across all {blueprint.length} exam domains,
          {' '}{glossary.length} terms explained on hover, {totalQuizQuestions + examBank.length} practice questions with
          full distractor analysis, a narrated intro video for every module, and a timed {examBank.length}-question mock exam scored by domain.
        </p>
        <div className="hero-cta">
          <Link className="btn btn-primary" to={`/module/${next.moduleId}/${next.lessonId}`}>
            {doneCount ? 'Continue learning' : 'Start module 1'} →
          </Link>
          <Link className="btn btn-ghost" to="/exam">Take a mock exam</Link>
          <Link className="btn btn-quiet" to="/roadmap">See the roadmap</Link>
        </div>

        <div className="stat-strip">
          <div className="stat"><b>{exam.questions}</b><span>Questions</span></div>
          <div className="stat"><b>120<small style={{ fontSize: '.6em', fontWeight: 600 }}> min</small></b><span>Duration</span></div>
          <div className="stat"><b>{exam.price.replace(' USD', '')}</b><span>Exam fee</span></div>
          <div className="stat"><b>31–33%</b><span>Top two domains</span></div>
          <div className="stat"><b>2 yrs</b><span>Validity</span></div>
        </div>
      </section>

      <section className="wrap" style={{ marginTop: 44 }}>
        <div className="grid g2">
          <div className="card">
            <div className="spread" style={{ marginBottom: 14 }}>
              <div>
                <span className="eyebrow">Your progress</span>
                <h3 style={{ margin: '4px 0 0' }}>{doneCount} of {totalLessons} lessons</h3>
              </div>
              <ScoreRing pct={pct} size={82} stroke={8} />
            </div>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            <p className="muted tiny" style={{ marginTop: 12, marginBottom: 14 }}>
              About {Math.round(totalMinutes / 60)} hours of reading in total, plus practice.
              Everything is stored locally in this browser.
            </p>
            <div className="grid g3" style={{ gap: 10 }}>
              <MiniStat label="Module quizzes" value={`${Object.keys(progress.quizzes).length}/${modules.length}`} />
              <MiniStat label="Mock exams" value={progress.exams.length} />
              <MiniStat label="Best mock" value={progress.exams.length ? `${Math.max(...progress.exams.map((e) => e.pct))}%` : '—'} />
            </div>
          </div>

          <div className="card">
            <span className="eyebrow">Official blueprint</span>
            <h3 style={{ margin: '4px 0 14px' }}>
              {lastExam ? 'Your last mock, by domain' : `${blueprint.length} domains, weighted`}
            </h3>
            <BlueprintChart scores={lastExam?.byDomain} />
            {lastExam && (
              <p className="tiny dim" style={{ marginTop: 12, marginBottom: 0 }}>
                Showing your most recent mock exam result. Domains in red are where to spend your next study session.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="wrap" style={{ marginTop: 40 }}>
        <div className="spread" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>The {modules.length} modules</h2>
          <Link className="btn btn-ghost btn-sm" to="/roadmap">Open roadmap →</Link>
        </div>
        <div className="grid g2">
          {modules.map((m) => {
            const p = moduleProgress(progress, m)
            const d = blueprint.find((b) => b.id === m.domain)
            return (
              <Link key={m.id} to={`/module/${m.id}`} className="card card-hover">
                <div className="mod-head">
                  <div className="mod-idx" style={p.pct === 100 ? { background: d.color, color: '#041018', borderColor: d.color } : undefined}>
                    {p.pct === 100 ? '✓' : String(m.n).padStart(2, '0')}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="mod-title">{m.title}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.5 }}>{m.blurb}</div>
                    <div className="mod-meta">
                      <span className="pill" style={{ color: d.color, borderColor: d.color }}>{m.weight}% of exam</span>
                      <span className="pill">{m.lessons.length} lessons</span>
                      <span className="pill">{m.quiz.length} questions</span>
                      {p.done > 0 && <span className="pill pill-ok">{p.done}/{p.total} done</span>}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="wrap" style={{ marginTop: 44 }}>
        <h2>How to use this site</h2>
        <div className="grid g3">
          <Step n="1" t="Read a module" d="Start with the module's intro video, then read the lessons — each ends with a five-question check. Technical terms are underlined: hover or tap for a definition and a note on how that term is tested." />
          <Step n="2" t="Take the module quiz" d="Immediate feedback with an explanation of the correct answer AND why each distractor fails. The distractor analysis is where the real learning is." />
          <Step n="3" t="Sit a timed mock" d={`${examBank.length} questions you have not seen in the modules, scored by domain against a 120-minute clock. Use the domain breakdown to decide what to re-read.`} />
        </div>
      </section>

      <section className="wrap" style={{ marginTop: 40 }}>
        <div className="card">
          <span className="eyebrow">Exam facts</span>
          <h3 style={{ marginTop: 6 }}>{exam.name}</h3>
          <div className="specs">
            <div className="spec"><b>Exam code</b><span>{exam.code}</span></div>
            <div className="spec"><b>Format</b><span>{exam.delivery}</span></div>
            <div className="spec"><b>Length</b><span>{exam.questions} questions · {exam.duration}</span></div>
            <div className="spec"><b>Price</b><span>{exam.price}</span></div>
            <div className="spec"><b>Validity</b><span>{exam.validity}</span></div>
            <div className="spec"><b>Recommended background</b><span>{exam.prereq}</span></div>
          </div>
          <a className="btn btn-ghost btn-sm" href={exam.officialUrl} target="_blank" rel="noreferrer">
            Official exam page ↗
          </a>{' '}
          <a className="btn btn-ghost btn-sm" href={exam.studyGuideUrl} target="_blank" rel="noreferrer">
            Official study guide (PDF) ↗
          </a>
        </div>
      </section>
    </>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px' }}>
      <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-.02em' }}>{value}</div>
      <div className="tiny dim" style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>{label}</div>
    </div>
  )
}

function Step({ n, t, d }) {
  return (
    <div className="card">
      <div className="mod-idx" style={{ marginBottom: 12 }}>{n}</div>
      <h3 style={{ fontSize: '1.02rem', margin: '0 0 6px' }}>{t}</h3>
      <p className="muted tiny" style={{ margin: 0, lineHeight: 1.6 }}>{d}</p>
    </div>
  )
}
