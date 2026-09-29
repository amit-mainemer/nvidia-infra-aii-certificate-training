/** Fisher-Yates. Returns a new array. */
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Randomise option order for a question while keeping the correct answer
 * pointed at the right item. Returns { opts, a } in the same shape.
 */
export function shuffleOptions(q) {
  const idx = shuffle(q.opts.map((_, i) => i))
  return {
    ...q,
    opts: idx.map((i) => q.opts[i]),
    a: idx.indexOf(q.a),
  }
}
