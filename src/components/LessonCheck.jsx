import { useState, useMemo, useEffect, useRef } from 'react'
import RichText from './RichText.jsx'
import { KEYS, Explanation } from './Quiz.jsx'
import { shuffleOptions } from '../lib/shuffle.js'
import { useProgress } from '../lib/progress.js'
import { checkPassMark } from '../data/checks/index.js'

/**
 * Short comprehension check at the end of a lesson. Every question is on the
 * page at once with immediate feedback; reaching the pass mark marks the
 * lesson complete.
 */
export default function LessonCheck({ moduleId, lessonId, questions }) {
  const progress = useProgress()
  const key = `${moduleId}/${lessonId}`
  const isDone = !!progress.lessons[key]
  const best = progress.checks?.[key]
  const total = questions.length
  const passMark = checkPassMark(total)

  const [attempt, setAttempt] = useState(0)
  const [answers, setAnswers] = useState({})
  // Lessons already completed start collapsed to a summary; retaking re-opens the questions.
  const [open, setOpen] = useState(!isDone)
  const savedRef = useRef(false)
  const topRef = useRef(null)

  const prepared = useMemo(
    () => questions.map(shuffleOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, attempt]
  )

  // New lesson: reset everything.
  useEffect(() => {
    setAnswers({}); setAttempt(0); setOpen(!progress.lessons[key]); savedRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const answered = Object.keys(answers).length
  const score = prepared.reduce((n, q, i) => n + (answers[i] === q.a ? 1 : 0), 0)
  const finished = answered === total
  const passed = score >= passMark

  useEffect(() => {
    if (!finished || savedRef.current) return
    savedRef.current = true
    progress.saveCheck(moduleId, lessonId, score, total, passed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  function retake() {
    savedRef.current = false
    setAnswers({})
    setAttempt((a) => a + 1)
    setOpen(true)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <section className="check" ref={topRef} aria-labelledby="check-title">
      <div className="check-head">
        <span className="eyebrow">Check your understanding</span>
        <h2 id="check-title">{total} quick questions</h2>
        <p className="muted">
          Get {passMark} of {total} right to mark this lesson complete. Each answer is explained straight away.
        </p>
      </div>

      {!open && isDone ? (
        <div className="check-result pass">
          <div className="check-score">✓</div>
          <div className="check-result-body">
            <strong>Lesson complete</strong>
            <span className="muted">
              {best ? `Best check score: ${best.score} / ${best.total}` : 'Marked complete before the check was added.'}
            </span>
          </div>
          <div className="check-actions">
            <button className="btn btn-ghost btn-sm" onClick={retake}>{best ? 'Retake check' : 'Take the check'}</button>
            <button className="btn btn-quiet btn-sm" onClick={() => progress.markLesson(moduleId, lessonId, false)}>
              Mark not complete
            </button>
          </div>
        </div>
      ) : (
        <>
          <ol className="check-list">
            {prepared.map((q, i) => {
              const chosen = answers[i]
              const revealed = chosen !== undefined
              return (
                <li className="q-card check-q" key={`${attempt}-${i}`}>
                  <div className="check-q-n">
                    <span>Question {i + 1} of {total}</span>
                    {revealed && (
                      <span className={`pill ${chosen === q.a ? 'pill-ok' : 'pill-bad'}`}>
                        {chosen === q.a ? 'Correct' : 'Not quite'}
                      </span>
                    )}
                  </div>
                  <div className="q-text"><RichText>{q.q}</RichText></div>
                  <div className="opts">
                    {q.opts.map((o, k) => {
                      let cls = ''
                      if (revealed) {
                        if (k === q.a) cls = 'right'
                        else if (chosen === k) cls = 'wrong'
                      }
                      return (
                        <button
                          key={k}
                          className={`opt ${cls}`}
                          disabled={revealed}
                          onClick={() => setAnswers((a) => ({ ...a, [i]: k }))}
                        >
                          <span className="opt-k">{KEYS[k]}</span>
                          <span><RichText>{o}</RichText></span>
                        </button>
                      )
                    })}
                  </div>
                  {revealed && <Explanation q={q} />}
                </li>
              )
            })}
          </ol>

          <div className={`check-result ${finished ? (passed ? 'pass' : 'fail') : ''}`} aria-live="polite">
            <div className="check-score">{finished ? `${score}/${total}` : `${answered}/${total}`}</div>
            <div className="check-result-body">
              {!finished && (
                <>
                  <strong>{answered === 0 ? 'Answer every question to finish' : `${total - answered} to go`}</strong>
                  <span className="muted">{score} correct so far · {passMark} needed to pass</span>
                </>
              )}
              {finished && passed && (
                <>
                  <strong>{score === total ? 'Perfect score — lesson complete' : 'Passed — lesson complete'}</strong>
                  <span className="muted">Progress saved. Read any explanations you got wrong before moving on.</span>
                </>
              )}
              {finished && !passed && (
                <>
                  <strong>Not quite — {passMark} of {total} needed</strong>
                  <span className="muted">Re-read the sections behind the questions you missed, then try again. Options are reshuffled each time.</span>
                </>
              )}
            </div>
            {finished && (
              <div className="check-actions">
                <button className={`btn btn-sm ${passed ? 'btn-ghost' : 'btn-primary'}`} onClick={retake}>
                  {passed ? 'Retake' : 'Try again'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
