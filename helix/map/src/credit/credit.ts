/** One run of a credit: words, and where they lead when they are a link. */
export interface CreditPart {
  /** Where the words lead, only ever an `http` or `https` address. */
  href?: string | undefined
  /** The words, as they are read. */
  text: string
}

/** What goes between two credits, which is what both renderers draw there. */
const BETWEEN = ' | '

/**
 * What marks a credit Helix wrote, the connector's or a snapshot's, so the
 * connector can tell one from the page's own: it replaces a credit with this,
 * and leaves one without it alone.
 */
export const CREDIT = 'data-helix-map-credit'

/** Whether an address is one a credit may lead to. */
const safe = (href: string | null): href is string => {
  if (!href) {
    return false
  }
  try {
    const { protocol } = new URL(href, 'https://example.invalid')
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Runs of text and links, in reading order, from one node down. */
const walk = (node: Node, into: CreditPart[]): void => {
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      into.push({ text: child.textContent ?? '' })
    } else if (child.nodeType === 1) {
      const element = child as Element
      const href = element.localName === 'a' ? element.getAttribute('href') : null
      if (safe(href)) {
        into.push({ href, text: element.textContent ?? '' })
      } else {
        walk(element, into)
      }
    }
  }
}

/** The entities a credit is written with, beside any written by number. */
const ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  copy: '©',
  gt: '>',
  lt: '<',
  nbsp: '\u00a0',
  quot: '"',
  reg: '®',
}

/** Words with their entities read, and an entity it does not know left as written. */
const decoded = (words: string): string =>
  words.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (written, name: string) => {
    if (name.startsWith('#')) {
      const code = /x/i.test(name) ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1))
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : written
    }
    return ENTITIES[name.toLowerCase()] ?? written
  })

/** A tag or a comment, its attributes read past a `>` inside quotes. */
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi

/** A tag's `href`, quoted or not. */
const HREF = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i

/**
 * Runs of text and links from markup, read without a DOM, which is what a
 * server drawing a snapshot has: the same runs `walk` reads where there is
 * one. Every tag is taken out, a link kept where it leads to `http` or
 * `https`, and its entities are read.
 */
const read = (markup: string, into: CreditPart[]): void => {
  let link: CreditPart | undefined
  let from = 0
  const words = (written: string): void => {
    if (written === '') {
      return
    }
    if (link) {
      link.text += decoded(written)
    } else {
      into.push({ text: decoded(written) })
    }
  }
  for (const tag of markup.matchAll(TAG)) {
    words(markup.slice(from, tag.index))
    from = tag.index + tag[0].length
    if (tag[2]?.toLowerCase() !== 'a') {
      continue
    }
    if (tag[1] === '/') {
      if (link) {
        into.push(link)
      }
      link = undefined
    } else if (!link) {
      const found = HREF.exec(tag[3] ?? '')
      const href = found ? decoded(found[1] ?? found[2] ?? found[3] ?? '') : null
      link = safe(href) ? { href, text: '' } : undefined
    }
  }
  words(markup.slice(from))
  if (link) {
    into.push(link)
  }
}

/** Words written into markup as text, or into an attribute in double quotes. */
const escaped = (words: string): string =>
  words.replace(/[&<>"]/g, (character) => `&#${character.charCodeAt(0)};`)

/**
 * A credit as the markup the connector writes into the frame: a span in the
 * `attribution` slot, marked as Helix's, of words and links that open in a new
 * tab in the text's own color. Nothing where the credit says nothing.
 */
export const creditMarkup = (parts: readonly CreditPart[]): string =>
  parts.length === 0
    ? ''
    : `<span ${CREDIT} slot="attribution">${parts
        .map((part) =>
          part.href === undefined
            ? escaped(part.text)
            : `<a data-link="quiet" href="${escaped(part.href)}" rel="noopener noreferrer" target="_blank">${escaped(part.text)}</a>`,
        )
        .join('')}</span>`

/**
 * A renderer's credits as runs of text and links, and nothing else.
 *
 * **Read as markup and rebuilt as text**, because a credit is markup from
 * whoever wrote the map's style or its tile layer: MapLibre and Leaflet both
 * set it as HTML, and passing it on would run whatever a style author wrote
 * in the page this sits in. So every element but a link is taken for its
 * words, a link only where it leads to `http` or `https`, and the result is
 * written with `textContent`. Two credits that read the same are one, which
 * is what a style that names OpenStreetMap on every source needs. A server,
 * which has no `DOMParser`, reads the same runs from the markup, so the credit
 * `mapSnapshot` writes reads as the one the renderer gives later.
 */
export const creditParts = (credits: readonly string[]): CreditPart[] => {
  const seen = new Set<string>()
  const parts: CreditPart[] = []
  for (const credit of credits) {
    const runs: CreditPart[] = []
    if (typeof DOMParser === 'function') {
      walk(new DOMParser().parseFromString(credit, 'text/html').body, runs)
    } else {
      read(credit, runs)
    }
    const clean = runs
      .map((run) => ({ ...run, text: run.text.replace(/\s+/g, ' ') }))
      .filter((run) => run.text !== '')
    const first = clean[0]
    const last = clean[clean.length - 1]
    if (first) {
      first.text = first.text.trimStart()
    }
    if (last) {
      last.text = last.text.trimEnd()
    }
    const words = clean.map((run) => run.text).join('')
    if (words === '' || seen.has(words)) {
      continue
    }
    seen.add(words)
    if (parts.length > 0) {
      parts.push({ text: BETWEEN })
    }
    parts.push(...clean.filter((run) => run.text !== ''))
  }
  return parts
}
