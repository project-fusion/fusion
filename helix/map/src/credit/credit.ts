/** One run of a credit: words, and where they lead when they are a link. */
export interface CreditPart {
  /** Where the words lead, only ever an `http` or `https` address. */
  href?: string | undefined
  /** The words, as they are read. */
  text: string
}

/** What goes between two credits, which is what both renderers draw there. */
const BETWEEN = ' | '

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

/**
 * A renderer's credits as runs of text and links, and nothing else.
 *
 * **Read as markup and rebuilt as text**, because a credit is markup from
 * whoever wrote the map's style or its tile layer: MapLibre and Leaflet both
 * set it as HTML, and passing it on would run whatever a style author wrote
 * in the page this sits in. So every element but a link is taken for its
 * words, a link only where it leads to `http` or `https`, and the result is
 * written with `textContent`. Two credits that read the same are one, which
 * is what a style that names OpenStreetMap on every source needs.
 */
export const creditParts = (credits: readonly string[]): CreditPart[] => {
  const seen = new Set<string>()
  const parts: CreditPart[] = []
  for (const credit of credits) {
    const runs: CreditPart[] = []
    if (typeof DOMParser === 'function') {
      walk(new DOMParser().parseFromString(credit, 'text/html').body, runs)
    } else {
      runs.push({ text: credit.replace(/<[^>]*>/g, '') })
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
