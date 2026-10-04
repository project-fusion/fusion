/**
 * What a finding is about, who fixes it, and which finding it is from one run
 * to the next.
 *
 * **The fingerprint is what turns findings into issues.** Without it, a
 * dashboard can count findings per run and cannot say whether the one in this
 * run is the one from last week, fixed, or back again.
 */
import type { Published } from './manifest.js'
import type { FindingCategory, Identified, Kind, Owner, Raw } from './report.js'

/** What each kind is about. */
const CATEGORY: Readonly<Record<Kind, FindingCategory>> = {
  'dead-hook': 'styling',
  'dead-part': 'styling',
  'duplicate-registration': 'integrity',
  'manifest-skew': 'integrity',
  'unforwarded-part': 'styling',
  'unknown-tag': 'integrity',
}

/**
 * Who fixes each kind. An unforwarded part is Helix's: the headless tier
 * publishes it and the styled tier never forwarded it. Across every project,
 * the `helix` findings are the library's own backlog.
 */
const OWNER: Readonly<Record<Kind, Owner>> = {
  'dead-hook': 'consumer',
  'dead-part': 'consumer',
  'duplicate-registration': 'consumer',
  'manifest-skew': 'consumer',
  'unforwarded-part': 'helix',
  'unknown-tag': 'consumer',
}

/**
 * A selector with what a build changes taken out, so the same rule in the
 * next build reads the same.
 *
 * **Hashed class names**, which CSS Modules write and every bundler hashes its
 * own way:
 *
 * - Next.js: `trace-graph-module__lFhy0q__traceFrame`, to `trace-graph-module__traceFrame`.
 * - webpack's default: `card__title___3xYz1`, to `card__title`.
 * - Vite's default: `_title_1a2b3_7`, to `_title`.
 *
 * webpack's is taken out first: its `___` would otherwise read as the end of
 * a Next.js hash. And spacing, which a minifier rewrites.
 */
export const normalize = (subject: string): string =>
  subject
    .replace(/___[A-Za-z0-9_-]{5}\b/g, '')
    .replace(/__[A-Za-z0-9_-]{6}__/g, '__')
    .replace(/\b(_[A-Za-z][A-Za-z0-9-]*)_[a-z0-9]{5}_\d+\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * cyrb53, a 53-bit string hash: fast, dependency free, and the same in every
 * engine, which is all an identity needs. Not for anything secret.
 */
const hash = (text: string): string => {
  let one = 0xdeadbeef
  let two = 0x41c6ce57
  for (let at = 0; at < text.length; at += 1) {
    const code = text.charCodeAt(at)
    one = Math.imul(one ^ code, 2654435761)
    two = Math.imul(two ^ code, 1597334677)
  }
  one = Math.imul(one ^ (one >>> 16), 2246822507) ^ Math.imul(two ^ (two >>> 13), 3266489909)
  two = Math.imul(two ^ (two >>> 16), 2246822507) ^ Math.imul(one ^ (one >>> 13), 3266489909)
  return (4294967296 * (2097151 & two) + (one >>> 0)).toString(16).padStart(14, '0')
}

/**
 * A finding's identity across runs: its kind, its tag, and its normalized
 * subject. **The stylesheet is left out**, since a bundler puts a content
 * hash in a file's name, so the same mistake in two stylesheets is one issue
 * seen twice, which is how a reader thinks of it.
 */
export const fingerprintOf = (finding: Pick<Raw, 'kind' | 'subject' | 'tag'>): string =>
  hash(`${finding.kind}\u0000${finding.tag}\u0000${normalize(finding.subject)}`)

/** A finding with its category, owner, family, and fingerprint. */
export const identify = (finding: Raw, tags: Map<string, Published>): Identified => ({
  ...finding,
  category: CATEGORY[finding.kind],
  family: tags.get(finding.tag)?.family,
  fingerprint: fingerprintOf(finding),
  owner: OWNER[finding.kind],
})
