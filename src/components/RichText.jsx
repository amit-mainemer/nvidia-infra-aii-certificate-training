import { Fragment } from 'react'
import GlossaryTerm from './GlossaryTerm.jsx'

/**
 * Minimal inline markup used throughout lesson content:
 *   [[term-id|display text]]  glossary popup
 *   [[term-id]]               glossary popup using the term's own name
 *   **bold**
 *   `code`
 *   [label](https://url)
 */
const TOKEN = /(\[\[[^\]]+\]\]|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g

export default function RichText({ children }) {
  if (typeof children !== 'string') return children
  const parts = children.split(TOKEN).filter((p) => p !== '' && p !== undefined)

  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('[[') && p.endsWith(']]')) {
          const inner = p.slice(2, -2)
          const [id, label] = inner.includes('|') ? inner.split('|') : [inner, null]
          return <GlossaryTerm key={i} id={id.trim()}>{label ? label.trim() : null}</GlossaryTerm>
        }
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={i}>{p.slice(2, -2)}</strong>
        }
        if (p.startsWith('`') && p.endsWith('`')) {
          return <code key={i} className="inline-code">{p.slice(1, -1)}</code>
        }
        const link = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(p)
        if (link) {
          return <a key={i} className="ext" href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>
        }
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}
