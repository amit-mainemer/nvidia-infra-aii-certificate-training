/**
 * Glossary powering the hover / click term popups across every article.
 * `id`   — the key used inside lesson text as [[id|display text]]
 * `exam` — why the term matters for NCP-AII specifically
 *
 * Shared terms live in glossary/core.js; each module adds its own file.
 * The first definition of an id wins, so core terms cannot be overridden.
 */
import core from './glossary/core.js'
import bringup from './glossary/bringup.js'
import physical from './glossary/physical.js'
import controlplane from './glossary/controlplane.js'
import verification from './glossary/verification.js'
import troubleshoot from './glossary/troubleshoot.js'

const seen = new Set()
export const glossary = [...core, ...bringup, ...physical, ...controlplane, ...verification, ...troubleshoot]
  .filter((g) => (seen.has(g.id) ? false : seen.add(g.id)))

export const glossaryById = Object.fromEntries(glossary.map((g) => [g.id, g]))
export const glossaryCats = [...new Set(glossary.map((g) => g.cat))]
