import { useState, Fragment } from 'react'
import RichText from './RichText.jsx'

export function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const CALLOUT_LABEL = {
  exam: 'Exam focus',
  tip: 'Tip',
  warn: 'Watch out',
  trap: 'Common trap',
}
const CALLOUT_ICON = { exam: '◆', tip: '✦', warn: '▲', trap: '✕' }

function CodeBlock({ lang, title, x }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="code">
      <div className="code-h">
        <span>{title || lang || 'code'}</span>
        <button
          className="copy"
          onClick={() => {
            navigator.clipboard?.writeText(x).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1400)
            })
          }}
        >{copied ? 'copied' : 'copy'}</button>
      </div>
      <pre><code>{x}</code></pre>
    </div>
  )
}

export default function Blocks({ blocks }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'lede':
            return <p key={i} className="lede"><RichText>{b.x}</RichText></p>
          case 'h2':
            return <h2 key={i} id={slugify(b.x)}>{b.x}</h2>
          case 'h3':
            return <h3 key={i} id={slugify(b.x)}>{b.x}</h3>
          case 'p':
            return <p key={i}><RichText>{b.x}</RichText></p>
          case 'ul':
            return <ul key={i}>{b.items.map((it, j) => <li key={j}><RichText>{it}</RichText></li>)}</ul>
          case 'ol':
            return <ol key={i}>{b.items.map((it, j) => <li key={j}><RichText>{it}</RichText></li>)}</ol>
          case 'code':
            return <CodeBlock key={i} {...b} />
          case 'callout':
            return (
              <div key={i} className={`callout ${b.kind}`}>
                <div className="callout-h">
                  <span aria-hidden>{CALLOUT_ICON[b.kind]}</span>
                  {b.title || CALLOUT_LABEL[b.kind]}
                </div>
                {Array.isArray(b.x)
                  ? <ul>{b.x.map((p, j) => <li key={j}><RichText>{p}</RichText></li>)}</ul>
                  : <p><RichText>{b.x}</RichText></p>}
              </div>
            )
          case 'table':
            return (
              <div key={i} className="tbl-wrap">
                <table className="tbl">
                  <thead><tr>{b.head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>{r.map((c, k) => <td key={k}><RichText>{c}</RichText></td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'vs':
            return (
              <div key={i} className="vs">
                {b.cards.map((c, j) => (
                  <div key={j} className="vs-card">
                    <h4>{c.h}</h4>
                    <ul>{c.items.map((it, k) => <li key={k}><RichText>{it}</RichText></li>)}</ul>
                  </div>
                ))}
              </div>
            )
          case 'flow':
            return (
              <div key={i} className="flow">
                {b.steps.map((s, j) => (
                  <Fragment key={j}>
                    <div className="flow-step">
                      <b>{s.b}</b>
                      <span><RichText>{s.s}</RichText></span>
                    </div>
                    {j < b.steps.length - 1 && <span className="flow-arrow" aria-hidden>→</span>}
                  </Fragment>
                ))}
              </div>
            )
          case 'specs':
            return (
              <div key={i} className="specs">
                {b.rows.map((r, j) => (
                  <div key={j} className="spec">
                    <b>{r[0]}</b>
                    <span><RichText>{r[1]}</RichText></span>
                  </div>
                ))}
              </div>
            )
          default:
            return null
        }
      })}
    </>
  )
}
