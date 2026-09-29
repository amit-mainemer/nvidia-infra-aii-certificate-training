import { useState, useEffect, useCallback } from 'react'

const KEY = 'ncp-aii-progress-v1'

const empty = {
  lessons: {},   // "moduleId/lessonId" -> true
  quizzes: {},   // moduleId -> { score, total, at }
  checks: {},    // "moduleId/lessonId" -> best end-of-lesson check { score, total, at }
  exams: [],     // [{ score, total, pct, at, byDomain }]
  bookmarks: {}, // "moduleId/lessonId" -> true
  lastSeen: null,
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty, ...JSON.parse(raw) } : { ...empty }
  } catch {
    return { ...empty }
  }
}

function write(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* private mode / storage disabled — progress just won't persist */
  }
}

/* A tiny store so every component re-renders when progress changes. */
let state = read()
const listeners = new Set()

function set(updater) {
  state = typeof updater === 'function' ? updater(state) : updater
  write(state)
  listeners.forEach((l) => l(state))
}

export function useProgress() {
  const [local, setLocal] = useState(state)

  useEffect(() => {
    listeners.add(setLocal)
    return () => listeners.delete(setLocal)
  }, [])

  const markLesson = useCallback((moduleId, lessonId, done = true) => {
    set((s) => {
      const lessons = { ...s.lessons }
      if (done) lessons[`${moduleId}/${lessonId}`] = true
      else delete lessons[`${moduleId}/${lessonId}`]
      return { ...s, lessons, lastSeen: { moduleId, lessonId } }
    })
  }, [])

  const touchLesson = useCallback((moduleId, lessonId) => {
    set((s) => ({ ...s, lastSeen: { moduleId, lessonId } }))
  }, [])

  const toggleBookmark = useCallback((moduleId, lessonId) => {
    set((s) => {
      const k = `${moduleId}/${lessonId}`
      const bookmarks = { ...s.bookmarks }
      if (bookmarks[k]) delete bookmarks[k]
      else bookmarks[k] = true
      return { ...s, bookmarks }
    })
  }, [])

  const saveQuiz = useCallback((moduleId, score, total) => {
    set((s) => {
      const prev = s.quizzes[moduleId]
      // keep the best attempt
      if (prev && prev.score / prev.total >= score / total) return s
      return { ...s, quizzes: { ...s.quizzes, [moduleId]: { score, total, at: Date.now() } } }
    })
  }, [])

  /* End-of-lesson check: keep the best attempt; passing marks the lesson complete. */
  const saveCheck = useCallback((moduleId, lessonId, score, total, passed) => {
    set((s) => {
      const k = `${moduleId}/${lessonId}`
      const prev = s.checks?.[k]
      const checks = !prev || score / total > prev.score / prev.total
        ? { ...s.checks, [k]: { score, total, at: Date.now() } }
        : s.checks
      const lessons = passed ? { ...s.lessons, [k]: true } : s.lessons
      return { ...s, checks, lessons }
    })
  }, [])

  const saveExam = useCallback((result) => {
    set((s) => ({ ...s, exams: [...s.exams, { ...result, at: Date.now() }].slice(-25) }))
  }, [])

  const reset = useCallback(() => set({ ...empty }), [])

  return { ...local, markLesson, touchLesson, toggleBookmark, saveQuiz, saveCheck, saveExam, reset }
}

export function isLessonDone(progress, moduleId, lessonId) {
  return !!progress.lessons[`${moduleId}/${lessonId}`]
}

export function moduleProgress(progress, mod) {
  const done = mod.lessons.filter((l) => isLessonDone(progress, mod.id, l.id)).length
  return { done, total: mod.lessons.length, pct: Math.round((done / mod.lessons.length) * 100) }
}

/* Theme -------------------------------------------------------------- */

const THEME_KEY = 'ncp-aii-theme'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'dark' } catch { return 'dark' }
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}
