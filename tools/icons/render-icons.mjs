// Render tools/icons/icon.svg (full-bleed) to the PNG app icons in public/, via headless Chrome.
// usage: node tools/icons/render-icons.mjs
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pub = join(here, '..', '..', 'public')
const svg = readFileSync(join(here, 'icon.svg'), 'utf8')
// favicon-32 is the rounded, simplified tab icon (public/favicon.svg) for browsers without SVG favicons.
// iOS rounds the corners itself and needs an opaque square; Android/PWA icons use the same full-bleed art.
const SIZES = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512, 'favicon-32.png': 32 }
const SOURCE = { 'favicon-32.png': join(pub, 'favicon.svg') }

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const profile = mkdtempSync(join(tmpdir(), 'icons-'))
const port = 9700 + Math.floor(Math.random() * 200)
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
try {
  let page
  for (let i = 0; i < 60 && !page; i++) {
    await sleep(200)
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { /* not up yet */ }
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = {}
  ws.onmessage = (e) => { const m = JSON.parse(e.data); pending[m.id]?.(m) }
  const send = (method, params = {}) => new Promise((r) => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })) })
  await send('Page.enable')
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  for (const [file, size] of Object.entries(SIZES)) {
    await send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false })
    const art = SOURCE[file] ? readFileSync(SOURCE[file], 'utf8') : svg
    const html = `<html><body style="margin:0;background:transparent">${art.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`
    await send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') })
    await sleep(400)
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 } })
    writeFileSync(join(pub, file), Buffer.from(shot.result.data, 'base64'))
    console.log(`public/${file} (${size}px)`)
  }
  ws.close()
} finally {
  chrome.kill()
  await sleep(300)
  rmSync(profile, { recursive: true, force: true })
}
