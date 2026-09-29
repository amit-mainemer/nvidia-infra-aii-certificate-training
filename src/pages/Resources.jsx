import { officialTraining, docs } from '../data/resources.js'
import { exam } from '../data/exam.js'
import { useProgress } from '../lib/progress.js'

export default function Resources() {
  const progress = useProgress()

  return (
    <div className="wrap">
      <span className="eyebrow">Resources</span>
      <h1 style={{ maxWidth: '20ch' }}>Official training and primary sources.</h1>
      <p className="hero-sub" style={{ marginBottom: 30 }}>
        This site is a study companion, not a replacement for hands-on work. The exam assumes two to three years of
        data-center experience with NVIDIA hardware, so run the commands on real GPU servers whenever you can.
        The reading lists below are the study guide's own suggested readings, grouped by domain.
      </p>

      <h2 style={{ fontSize: '1.15rem' }}>NVIDIA-recommended training</h2>
      <p className="muted tiny" style={{ marginTop: -6, marginBottom: 14 }}>
        The training NVIDIA recommends on the official exam page and study guide, with what each one actually buys you.
      </p>
      <div className="grid g2" style={{ marginBottom: 34 }}>
        {officialTraining.map((c) => (
          <a key={c.name} className="card card-hover" href={c.url} target="_blank" rel="noreferrer">
            <h3 style={{ fontSize: '1rem', margin: '0 0 8px' }}>{c.name}</h3>
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="pill pill-nv">{c.price}</span>
              <span className="pill">{c.hours}</span>
              <span className="pill">{c.mode}</span>
            </div>
            <p className="muted tiny" style={{ margin: 0, lineHeight: 1.6 }}>{c.why}</p>
          </a>
        ))}
      </div>

      {docs.map((group) => (
        <section key={group.group} style={{ marginBottom: 34 }}>
          <h2 style={{ fontSize: '1.15rem' }}>{group.group}</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {group.items.map((it) => (
              <a key={it.url} className="card card-hover" href={it.url} target="_blank" rel="noreferrer" style={{ padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: 3 }}>
                  {it.name} <span className="dim" style={{ fontWeight: 400 }}>↗</span>
                </div>
                <div className="muted tiny" style={{ lineHeight: 1.55 }}>{it.note}</div>
              </a>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 style={{ fontSize: '1.15rem' }}>Registration</h2>
        <div className="card">
          <div className="specs" style={{ margin: 0 }}>
            <div className="spec"><b>Exam</b><span>{exam.name} ({exam.code})</span></div>
            <div className="spec"><b>Delivery</b><span>{exam.delivery}</span></div>
            <div className="spec"><b>Price</b><span>{exam.price}</span></div>
            <div className="spec"><b>Length</b><span>{exam.questions} questions · {exam.duration}</span></div>
            <div className="spec"><b>Validity</b><span>{exam.validity}</span></div>
          </div>
          <a className="btn btn-primary btn-sm" style={{ marginTop: 14 }} href={exam.officialUrl} target="_blank" rel="noreferrer">
            Register on the official page ↗
          </a>
        </div>
      </section>

      <section style={{ marginTop: 34 }}>
        <h2 style={{ fontSize: '1.15rem' }}>Your data</h2>
        <div className="card">
          <p className="muted tiny">
            All progress — completed lessons, quiz scores and mock exam history — is stored in this browser's
            local storage only. Nothing is sent anywhere. Clearing site data or using a different browser resets it.
          </p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (confirm('Reset all progress, quiz scores and exam history? This cannot be undone.')) progress.reset()
            }}
          >Reset all progress</button>
        </div>
      </section>
    </div>
  )
}
