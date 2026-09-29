import m01 from './m01-bringup.js'
import m02 from './m02-physical.js'
import m03 from './m03-controlplane.js'
import m04 from './m04-verification.js'
import m05 from './m05-troubleshoot.js'

export const modules = [m01, m02, m03, m04, m05]
export const moduleById = Object.fromEntries(modules.map((m) => [m.id, m]))

export const allLessons = modules.flatMap((m) =>
  m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title }))
)

export const totalLessons = allLessons.length
export const totalQuizQuestions = modules.reduce((n, m) => n + m.quiz.length, 0)
export const totalMinutes = allLessons.reduce((n, l) => n + l.minutes, 0)

/** Flat pool of every module quiz question, used by the practice/mock builder. */
export const questionPool = modules.flatMap((m) =>
  m.quiz.map((q) => ({ ...q, moduleId: m.id, moduleTitle: m.title }))
)
