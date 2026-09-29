// Validate course content: glossary links resolve, answer indexes are sane, counts match the spec.
// usage: node tools/check-content.mjs [moduleId]   (moduleId limits module/lesson checks to one module)
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const only = process.argv[2]
const MODULES = [
  ['bringup', 'm01-bringup', 16, 6],
  ['physical', 'm02-physical', 8, 2],
  ['controlplane', 'm03-controlplane', 12, 4],
  ['verification', 'm04-verification', 16, 5],
  ['troubleshoot', 'm05-troubleshoot', 10, 3],
]
const EXAM = { bringup: 22, physical: 4, controlplane: 13, verification: 23, troubleshoot: 8 }

const load = async (rel) => {
  const p = join(root, rel)
  return existsSync(p) ? (await import(pathToFileURL(p).href)) : null
}
const errors = []
const warn = []
const err = (m) => errors.push(m)

// glossary: core + whichever module files exist
const glossary = []
for (const f of ['core', ...MODULES.map((m) => m[0])]) {
  const g = await load(`src/data/glossary/${f}.js`)
  if (!g) { if (f !== 'core') warn.push(`glossary/${f}.js missing`); continue }
  for (const e of g.default) {
    if (!e.id || !e.term || !e.def || !e.cat) err(`glossary/${f}: incomplete entry ${JSON.stringify(e.id)}`)
    if (glossary.some((x) => x.id === e.id)) err(`glossary/${f}: duplicate id "${e.id}" (already defined earlier — reuse it)`)
    glossary.push({ ...e, file: f })
  }
}
const ids = new Set(glossary.map((g) => g.id))

const LINK = /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g
function scanText(where, value) {
  const walk = (v) => {
    if (typeof v === 'string') {
      for (const m of v.matchAll(LINK)) if (!ids.has(m[1].trim())) err(`${where}: unknown glossary id [[${m[1]}]]`)
      if ((v.match(/\*\*/g) || []).length % 2) err(`${where}: unbalanced ** in "${v.slice(0, 60)}…"`)
    } else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(value)
}
function checkQ(where, q, needId) {
  if (typeof q.q !== 'string' || !Array.isArray(q.opts)) return err(`${where}: malformed question`)
  if (q.opts.length !== 4) err(`${where}: expected 4 options, got ${q.opts.length}`)
  if (!Number.isInteger(q.a) || q.a < 0 || q.a >= q.opts.length) err(`${where}: bad answer index ${q.a}`)
  if (!q.why) err(`${where}: missing why`)
  if (!q.distract) warn.push(`${where}: missing distract`)
  if (needId && (!q.id || !q.domain)) err(`${where}: missing id/domain`)
  if (new Set(q.opts).size !== q.opts.length) err(`${where}: duplicate options`)
  scanText(where, q)
}

// Required shape per block type — mirrors what src/components/Blocks.jsx renders.
const isStr = (v) => typeof v === 'string'
const isStrArr = (v) => Array.isArray(v) && v.length > 0 && v.every(isStr)
const BLOCKS = {
  lede: (b) => isStr(b.x), h2: (b) => isStr(b.x), h3: (b) => isStr(b.x), p: (b) => isStr(b.x),
  ul: (b) => isStrArr(b.items), ol: (b) => isStrArr(b.items),
  code: (b) => isStr(b.x),
  callout: (b) => ['exam', 'tip', 'warn', 'trap'].includes(b.kind) && (isStr(b.x) || isStrArr(b.x)),
  table: (b) => isStrArr(b.head) && Array.isArray(b.rows) && b.rows.every((r) => isStrArr(r)),
  vs: (b) => Array.isArray(b.cards) && b.cards.every((c) => isStr(c.h) && isStrArr(c.items)),
  flow: (b) => Array.isArray(b.steps) && b.steps.every((s) => isStr(s.b) && isStr(s.s)),
  specs: (b) => Array.isArray(b.rows) && b.rows.every((r) => Array.isArray(r) && r.length === 2 && r.every(isStr)),
}
function checkBlock(where, b) {
  const ok = BLOCKS[b?.t]
  if (!ok) return err(`${where}: unknown block type`)
  if (!ok(b)) err(`${where}: wrong shape — keys ${Object.keys(b).join(',')}`)
}

const answerDist = [0, 0, 0, 0]
const qids = new Set()
for (const [id, file, quizN, lessonN] of MODULES) {
  if (only && only !== id) continue
  const mod = (await load(`src/data/modules/${file}.js`))?.default
  const checks = (await load(`src/data/checks/${file}.js`))?.default
  if (!mod) { warn.push(`module ${file} missing`); continue }
  if (mod.id !== id || mod.domain !== id) err(`${file}: id/domain should be "${id}"`)
  if (mod.lessons.length !== lessonN) err(`${file}: expected ${lessonN} lessons, got ${mod.lessons.length}`)
  if (mod.quiz.length !== quizN) err(`${file}: expected ${quizN} quiz questions, got ${mod.quiz.length}`)
  for (const l of mod.lessons) {
    if (!l.id || !l.title || !l.minutes || !Array.isArray(l.blocks)) err(`${file}/${l.id}: malformed lesson`)
    l.blocks.forEach((b, i) => checkBlock(`${file}/${l.id} block ${i + 1} (${b.t})`, b))
    scanText(`${file}/${l.id}`, l.blocks)
    const c = checks?.[l.id]
    if (!c) err(`checks/${file}: no check for lesson ${l.id}`)
    else {
      if (c.length !== 5) err(`checks/${file}/${l.id}: expected 5 questions, got ${c.length}`)
      c.forEach((q, i) => { checkQ(`checks/${file}/${l.id}#${i + 1}`, q); answerDist[q.a]++ })
    }
  }
  mod.quiz.forEach((q, i) => {
    checkQ(`${file}/quiz#${i + 1}`, q, true)
    if (q.domain !== id) err(`${file}/quiz#${i + 1}: domain should be ${id}`)
    if (qids.has(q.id)) err(`${file}/quiz: duplicate question id ${q.id}`)
    qids.add(q.id); answerDist[q.a]++
  })
}

if (!only) {
  const bank = (await load('src/data/examBank.js'))?.examBank
  if (!bank) warn.push('examBank.js missing')
  else {
    const per = {}
    bank.forEach((q, i) => {
      checkQ(`examBank#${i + 1} (${q.id})`, q, true)
      if (qids.has(q.id)) err(`examBank: duplicate question id ${q.id}`)
      qids.add(q.id); answerDist[q.a]++
      per[q.domain] = (per[q.domain] || 0) + 1
    })
    for (const [d, n] of Object.entries(EXAM)) if (per[d] !== n) err(`examBank: domain ${d} has ${per[d] || 0}, expected ${n}`)
  }
}

warn.forEach((w) => console.log('warn ', w))
errors.forEach((e) => console.log('ERROR', e))
console.log(`glossary ${glossary.length} terms · answer positions A/B/C/D = ${answerDist.join('/')}`)
console.log(errors.length ? `${errors.length} error(s)` : 'OK')
process.exit(errors.length ? 1 : 0)
