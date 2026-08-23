import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BODIES } from './insights/bodies'

/**
 * An insight's body, as markdown, serialized from what the page actually
 * renders.
 *
 * **Not a second copy of the essay and not a transform of its source.** The
 * body is a React component, so the honest way to get markdown out of it is to
 * render it and convert the result: one source, one render path, and a
 * serialization of the thing the reader sees rather than of the file it was
 * written in. An essay cannot drift from its own output.
 *
 * That is a narrow enough job to do by hand because the vocabulary is closed.
 * Counted across all six: `p`, `h2`, `code`, `strong`, `em`, `blockquote` and
 * one `helix-blockquote`. **Anything outside that list throws**, which is what
 * makes this safe rather than clever: an essay that reaches for a table or a
 * list fails the build instead of silently losing it, and the fix is a case in
 * `INLINE` or `BLOCK` rather than a hole in a published document.
 *
 * The alternative was an MDX pipeline, which `12-ai-native-web.md` specifies
 * and which is the right long-term answer for prose authored as prose. This is
 * the answer for prose that already exists as components, and it is what makes
 * the six posts readable today rather than after that pipeline lands.
 */

/** React writes `<!-- -->` between adjacent text nodes; markdown wants neither. */
const COMMENT = /<!--\s*-->/g

/** Entities `renderToStaticMarkup` emits, back to the characters they were. */
const ENTITIES: Array<[RegExp, string]> = [
  [/&quot;/g, '"'],
  [/&#x27;/g, "'"],
  [/&amp;/g, '&'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
]

/** Inline tags, and what wraps their text in markdown. */
const INLINE: Record<string, string> = {
  code: '`',
  em: '*',
  strong: '**',
}

const decode = (text: string): string =>
  ENTITIES.reduce((carry, [pattern, character]) => carry.replace(pattern, character), text)

/** One block's inner HTML, as a single line of markdown. */
const inline = (html: string, slug: string): string => {
  let text = html.replace(COMMENT, '')
  for (const [tag, fence] of Object.entries(INLINE)) {
    text = text.replace(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'), `${fence}$1${fence}`)
  }
  text = text.replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)')
  const stray = /<([a-z][a-z0-9-]*)/.exec(text)
  if (stray) {
    throw new Error(`${slug}: <${stray[1]}> has no markdown form. Add one to \`INLINE\`.`)
  }
  return decode(text).replace(/\s+/g, ' ').trim()
}

/** Block tags, and how each opens in markdown. */
const BLOCK: Record<string, (body: string) => string> = {
  blockquote: (body) => `> ${body}`,
  h2: (body) => `## ${body}`,
  h3: (body) => `### ${body}`,
  'helix-blockquote': (body) => `> ${body}`,
  p: (body) => body,
}

/**
 * Every insight body, keyed by slug.
 *
 * Rendered once per build rather than per request, because `bun run catalog`
 * writes the files and nothing reads this at runtime.
 */
export const insightMarkdown = (slug: string): string | undefined => {
  const body = BODIES[slug]
  if (!body) {
    return undefined
  }
  const html = renderToStaticMarkup(createElement(body))
  const blocks: string[] = []
  /* Top-level elements only. None of these essays nests a block inside another,
     which the throw below is what keeps true. */
  for (const [, tag, inner] of html.matchAll(/<([a-z][a-z0-9-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
    const open = BLOCK[tag as string]
    if (!open) {
      throw new Error(`${slug}: <${tag}> has no markdown form. Add one to \`BLOCK\`.`)
    }
    blocks.push(open(inline(inner as string, slug)))
  }
  if (blocks.length === 0) {
    throw new Error(`${slug}: rendered to no blocks at all, which is not an essay`)
  }
  return blocks.join('\n\n')
}
