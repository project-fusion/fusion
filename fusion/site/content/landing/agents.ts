/**
 * The Agents band, read from the manifest the page builds against.
 *
 * The excerpt is one element of `@fusion.dev/helix/custom-elements.json`, the
 * file an agent fetches at `/helix/custom-elements.json`. The tag and the names
 * of every attribute and event are taken from that file, so the band shows the
 * manifest.
 */

import { createRequire } from 'node:module'
import type { HelixDeclaration, HelixManifest } from '@fusion.dev/helix-cem'
import { SITE } from '@/utils/site/site'

const require = createRequire(import.meta.url)

/** The manifest `@fusion.dev/helix` publishes, which is what the URL serves. */
const manifest = require('@fusion.dev/helix/custom-elements.json') as HelixManifest

/** The element the exchange asks about. */
const TAG = 'helix-button'

const declaration = manifest.modules
  ?.flatMap((module) => module.declarations ?? [])
  .find((one): one is HelixDeclaration => one.tagName === TAG)

const attributes = declaration?.attributes?.map((one) => one.name) ?? []
const events = declaration?.events?.flatMap((one) => (one.name ? [one.name] : [])) ?? []

if (!declaration?.tagName || attributes.length === 0 || events.length === 0) {
  throw new Error(`agents: ${TAG} in @fusion.dev/helix/custom-elements.json has no excerpt`)
}

/** The fields the question asks for, keys in the repository's alphabetical order. */
const answer = { attributes, events, tagName: declaration.tagName }

/**
 * The question, the request, and the answer, in the order an exchange runs.
 *
 * `url` is what the snippet copies, whole, so a reader can open it. `excerpt`
 * is the same manifest cut to the fields the question asks for, one field to a
 * line so the list of names wraps across the width and the excerpt stays
 * short, and `line` is the same answer on one line, for the Markdown mirror.
 */
export const AGENT_EXCHANGE = {
  answer: `The manifest's entry for ${TAG}, cut to the fields the question asks for.`,
  excerpt: `{\n${Object.entries(answer)
    .map(
      ([key, value]) =>
        `  ${JSON.stringify(key)}: ${JSON.stringify(value).replaceAll('","', '", "')}`,
    )
    .join(',\n')}\n}`,
  line: JSON.stringify(answer),
  question: `What attributes and events does ${TAG} have?`,
  url: `${SITE}/helix/custom-elements.json`,
} as const

/**
 * The two other surfaces, both routes this site serves.
 *
 * `llms.txt` is the index, and a family's `.json` is the same content as its
 * page, structured. The button family is the one the exchange already asked
 * about, so the second link continues it.
 */
export const AGENT_SURFACES = [
  { href: '/llms.txt', label: 'Read the index' },
  { href: '/helix/components/button.json', label: 'Read the button family' },
] as const
