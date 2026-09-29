import c01 from './m01-bringup.js'
import c02 from './m02-physical.js'
import c03 from './m03-controlplane.js'
import c04 from './m04-verification.js'
import c05 from './m05-troubleshoot.js'

/** End-of-lesson comprehension checks: moduleId -> lessonId -> questions. */
const checks = {
  bringup: c01,
  physical: c02,
  controlplane: c03,
  verification: c04,
  troubleshoot: c05,
}

export function lessonCheck(moduleId, lessonId) {
  return checks[moduleId]?.[lessonId] || []
}

/** Share of questions needed to pass a lesson check and mark the lesson complete. */
export const CHECK_PASS = 0.7

export function checkPassMark(total) {
  return Math.ceil(total * CHECK_PASS)
}
