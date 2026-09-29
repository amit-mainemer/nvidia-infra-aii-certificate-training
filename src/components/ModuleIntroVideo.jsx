import { useEffect, useRef, useState } from 'react'
import { moduleVideo, lessonVideo } from '../data/videos.js'

/**
 * Narrated intro for a module or lesson. English subtitles are drawn in a bar under the
 * video (readable on phones, never covering the slide); in fullscreen the
 * browser's own caption rendering takes over.
 *
 * `compact` renders a small "watch the intro" tile that expands into the
 * player (used on the roadmap, where every full player would be too heavy).
 */
export default function ModuleIntroVideo({ mod, compact = false }) {
  return <IntroVideo v={moduleVideo(mod.id)} label="Module intro" compact={compact}
    blurb="A real-world case for why this module matters" />
}

/** Short narrated intro at the top of a lesson. */
export function LessonIntroVideo({ mod, lesson }) {
  return <IntroVideo v={lessonVideo(mod.id, lesson.id)} label="Lesson intro"
    blurb="A real-world example, then this lesson's key ideas" />
}

function IntroVideo({ v, label, blurb, compact = false }) {
  const [open, setOpen] = useState(!compact)
  if (!v) return null

  if (!open) {
    return (
      <button className="intro-tile" onClick={() => setOpen(true)}>
        <span className="intro-thumb" style={{ backgroundImage: `url(${v.poster})` }}>
          <span className="intro-play" aria-hidden="true" />
        </span>
        <span className="intro-tile-text">
          <b>Watch the {label.toLowerCase()}</b>
          <span>{v.length} · narrated · subtitles</span>
        </span>
      </button>
    )
  }
  return <Player v={v} label={label} blurb={blurb} autoPlay={compact} />
}

function Player({ v, label, blurb, autoPlay }) {
  const videoRef = useRef(null)
  const [cue, setCue] = useState('')
  const [cc, setCc] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    const track = video?.textTracks[0]
    if (!track) return
    const nativeCaptions = (on) => { track.mode = on && cc ? 'showing' : 'hidden' }
    const onCue = () => setCue(track.activeCues?.[0]?.text || '')
    const onFs = () => nativeCaptions(document.fullscreenElement === video)
    const onIosBegin = () => nativeCaptions(true)
    const onIosEnd = () => nativeCaptions(false)

    nativeCaptions(false)
    track.addEventListener('cuechange', onCue)
    document.addEventListener('fullscreenchange', onFs)
    video.addEventListener('webkitbeginfullscreen', onIosBegin)
    video.addEventListener('webkitendfullscreen', onIosEnd)
    return () => {
      track.removeEventListener('cuechange', onCue)
      document.removeEventListener('fullscreenchange', onFs)
      video.removeEventListener('webkitbeginfullscreen', onIosBegin)
      video.removeEventListener('webkitendfullscreen', onIosEnd)
    }
  }, [cc, v.vtt])

  return (
    <figure className="intro-video">
      <video ref={videoRef} controls playsInline autoPlay={autoPlay} preload="metadata" poster={v.poster}>
        <source src={v.mp4} type="video/mp4" />
        <track kind="subtitles" src={v.vtt} srcLang="en" label="English" default />
      </video>
      {cc && <div className="intro-cc" aria-live="off">{cue}</div>}
      <figcaption>
        <span className="pill pill-nv">{label}</span>
        <span className="intro-meta">{blurb} · {v.length}</span>
        <button className={`cc-btn ${cc ? 'on' : ''}`} onClick={() => setCc((c) => !c)} aria-pressed={cc} title="Subtitles">
          CC
        </button>
      </figcaption>
    </figure>
  )
}
