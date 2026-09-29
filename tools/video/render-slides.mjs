// Render every <section class="slide"> in an HTML file to PNG via headless Chrome (CDP).
// usage: node render-slides.mjs <slides.html> <out-dir> [scale=2]
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename, extname, normalize } from 'node:path'

const [html, outDir, scaleArg] = process.argv.slice(2)
const scale = +(scaleArg || 2)
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
mkdirSync(outDir, { recursive: true })

// Serve the slides folder over HTTP so <use href="sprites.svg#…"> can load (file:// blocks it).
const root = dirname(resolve(html))
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.js': 'text/javascript' }
const server = createServer((req, res) => {
  const p = normalize(join(root, decodeURIComponent(req.url.split('?')[0])))
  if (!p.startsWith(root) || !existsSync(p)) { res.writeHead(404).end(); return }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }).end(readFileSync(p))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const pageUrl = `http://127.0.0.1:${server.address().port}/${basename(html)}`

const profile = mkdtempSync(join(tmpdir(), 'slides-'))
const port = 9400 + Math.floor(Math.random() * 400)
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, '--hide-scrollbars', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

try {
  let page
  for (let i = 0; i < 60 && !page; i++) {
    await sleep(200)
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { /* not up yet */ }
  }
  if (!page) throw new Error('Chrome did not start')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = {}
  ws.onmessage = (e) => { const m = JSON.parse(e.data); pending[m.id]?.(m) }
  const send = (method, params = {}) => new Promise((r) => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })) })

  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: scale, mobile: false })
  await send('Page.enable')
  await send('Page.navigate', { url: pageUrl })
  await sleep(1500)
  await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true })

  const { result } = await send('Runtime.evaluate', {
    expression: 'JSON.stringify([...document.querySelectorAll(".slide")].map(s => { const r = s.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY } }))',
    returnByValue: true,
  })
  const slides = JSON.parse(result.result.value)
  for (const [i, s] of slides.entries()) {
    const shot = await send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: s.x, y: s.y, width: 1920, height: 1080, scale: 1 },
    })
    writeFileSync(join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`), Buffer.from(shot.result.data, 'base64'))
  }
  console.log(`rendered ${slides.length} slides → ${outDir}`)
  ws.close()
} finally {
  chrome.kill()
  server.close()
  await sleep(300)
  rmSync(profile, { recursive: true, force: true })
}
