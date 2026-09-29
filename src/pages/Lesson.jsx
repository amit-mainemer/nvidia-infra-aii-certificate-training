import { useEffect, useState, useMemo } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { moduleById, modules } from '../data/modules/index.js'
import { blueprint } from '../data/exam.js'
import { useProgress } from '../lib/progress.js'
import Blocks, { slugify } from '../components/Blocks.jsx'
import LessonCheck from '../components/LessonCheck.jsx'
import { LessonIntroVideo } from '../components/ModuleIntroVideo.jsx'
import { lessonCheck } from '../data/checks/index.js'
import { objectives, lessonObjectives } from '../data/objectives.js'

export default function Lesson() {
  const { moduleId, lessonId } = useParams()
  const mod = moduleById[moduleId]
  const lesson = mod?.lessons.find((l) => l.id === lessonId)
  const progress = useProgress()
  const [active, setActive] = useState(null)

  const headings = useMemo(
    () => (lesson ? lesson.blocks.filter((b) => b.t === 'h2').map((b) => ({ id: slugify(b.x), text: b.x })) : []),
    [lesson]
  )

  useEffect(() => {
    if (mod && lesson) progress.touchLesson(mod.id, lesson.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, lessonId])

  useEffect(() => {
    if (!headings.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -70% 0px' }
    )
    ;[...headings.map((h) => h.id), 'check-title'].forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [headings])

  if (!mod || !lesson) return <Navigate to="/roadmap" replace />

  const idx = mod.lessons.findIndex((l) => l.id === lesson.id)
  const prev = idx > 0 ? mod.lessons[idx - 1] : null
  const nextInMod = idx < mod.lessons.length - 1 ? mod.lessons[idx + 1] : null
  const nextMod = modules.find((m) => m.n === mod.n + 1)
  const isDone = !!progress.lessons[`${mod.id}/${lesson.id}`]
  const d = blueprint.find((b) => b.id === mod.domain)
  const check = lessonCheck(mod.id, lesson.id)
  const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="wrap">
      <div className="crumb">
        <Link to="/roadmap">Roadmap</Link> <span>/</span>
        <Link to={`/module/${mod.id}`}>{mod.title}</Link> <span>/</span>
        <span>Lesson {idx + 1}</span>
      </div>

      <div className="lesson-layout">
        <article>
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="pill" style={{ color: d.color, borderColor: d.color }}>Domain {mod.n} · {mod.weight}%</span>
            <span className="pill">{lesson.minutes} min read</span>
          </div>
          <h1 className="lesson-title">{lesson.title}</h1>

          {lessonObjectives[`${mod.id}/${lesson.id}`] && (
            <div className="objectives">
              <span className="objectives-h">Official objectives covered</span>
              <ul>
                {lessonObjectives[`${mod.id}/${lesson.id}`].map((o) => (
                  <li key={o}><b>{o}</b> {objectives[o]}</li>
                ))}
              </ul>
            </div>
          )}

          {headings.length > 1 && (
            <details className="toc-mobile">
              <summary>On this page <span className="dim">· {headings.length} sections{check.length ? ' + check' : ''}</span></summary>
              <nav>
                {headings.map((h) => (
                  <a key={h.id} href={`#${h.id}`} onClick={(e) => { e.preventDefault(); e.currentTarget.closest('details').open = false; jumpTo(h.id) }}>{h.text}</a>
                ))}
                {check.length > 0 && (
                  <a href="#check-title" onClick={(e) => { e.preventDefault(); e.currentTarget.closest('details').open = false; jumpTo('check-title') }}>Check your understanding</a>
                )}
              </nav>
            </details>
          )}

          <LessonIntroVideo key={lesson.id} mod={mod} lesson={lesson} />

          <div className="prose">
            <Blocks blocks={lesson.blocks} />
          </div>

          {check.length > 0 ? (
            <LessonCheck moduleId={mod.id} lessonId={lesson.id} questions={check} />
          ) : (
            <div
              className={`checkline ${isDone ? 'on' : ''}`}
              style={{ marginTop: 36 }}
              onClick={() => progress.markLesson(mod.id, lesson.id, !isDone)}
              role="checkbox"
              aria-checked={isDone}
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && progress.markLesson(mod.id, lesson.id, !isDone)}
            >
              <span className="box">✓</span>
              <span>{isDone ? 'Marked complete — nice work.' : 'Mark this lesson complete'}</span>
            </div>
          )}

          <div className="lesson-nav">
            {prev
              ? <Link className="btn btn-ghost" to={`/module/${mod.id}/${prev.id}`}>← {prev.title.slice(0, 30)}{prev.title.length > 30 ? '…' : ''}</Link>
              : <Link className="btn btn-ghost" to={`/module/${mod.id}`}>← Module overview</Link>}
            {nextInMod
              ? <Link className="btn btn-primary" to={`/module/${mod.id}/${nextInMod.id}`}>Next lesson →</Link>
              : <Link className="btn btn-primary" to={`/practice/${mod.id}`}>Take the module quiz →</Link>}
          </div>

          {!nextInMod && nextMod && (
            <p className="tiny dim center" style={{ marginTop: 18 }}>
              After the quiz, continue to <Link to={`/module/${nextMod.id}`} style={{ color: 'var(--nv)' }}>Module {nextMod.n}: {nextMod.title}</Link>.
            </p>
          )}
        </article>

        <aside className="toc">
          <div className="toc-title">On this page</div>
          {headings.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              className={active === h.id ? 'on' : ''}
              onClick={(e) => { e.preventDefault(); jumpTo(h.id) }}
            >{h.text}</a>
          ))}
          {check.length > 0 && (
            <a href="#check-title" className={active === 'check-title' ? 'on' : ''} onClick={(e) => { e.preventDefault(); jumpTo('check-title') }}>Check your understanding</a>
          )}
        </aside>
      </div>
    </div>
  )
}
