/**
 * Finding words in what a page shows, as ranges over its text, and painting
 * them with the Custom Highlight API: the query every finder takes, and the
 * finder Find uses for the content its `for` names.
 *
 * **Painted, and nothing is inserted.** The text is the page's own light DOM,
 * often written by React or by another Helix family, and a `<mark>` wrapped
 * around a match would be undone by the next render or would break it, as
 * `filter-marks` explains for a filtered list.
 */

/** What every match is painted as, in `CSS.highlights` and in `base.css`. */
export const FIND_MATCH = 'helix-find-match'

/** What the current match is painted as, over the others. */
export const FIND_CURRENT = 'helix-find-current'

/** The search Find hands a finder. */
export interface FindQuery {
  /** Whether case has to match, so "Error" does not find "error". */
  caseSensitive: boolean
  /** Whether `search` is a regular expression, in JavaScript's syntax. */
  regex: boolean
  /** What Replace puts in place of a match. */
  replace: string
  /** What the reader typed. */
  search: string
  /** Whether a match has to be a whole word. */
  wholeWord: boolean
}

/** Where a search stands: how many matches, and which is current, counting from 0, or -1 for none. */
export interface FindResult {
  count: number
  index: number
}

/**
 * Which match a search makes current. `first` stays on the current match
 * where it still matches, as while the reader types, and otherwise takes the
 * next one from there. `next` and `previous` move one match either way, and
 * wrap around at the ends.
 */
export type FindDirection = 'first' | 'next' | 'previous'

/**
 * Whatever searches content for Find: the text finder Find makes for the
 * content `for` names, or one a frame or a page attaches, as Terminal's
 * emulator and Code Editor's engine are.
 */
export interface Finder {
  /** Takes away the marks a search drew, as Find closes or its field empties. */
  end(): void
  /**
   * Finds `query`, marks every match, and makes one current by `direction`.
   * Returns where the search stands, or `undefined` from a finder that reports
   * it later through the sink `attach` returned, as one that searches in a
   * worker does.
   */
  find(query: FindQuery, direction: FindDirection): FindResult | undefined
  /**
   * Replaces the current match, or every match with `all`, and returns where
   * the search stands after. Find offers replacing only to a finder that has
   * this.
   */
  replace?(query: FindQuery, all: boolean): FindResult | undefined
}

/** The pattern a query reads as, or nothing for an empty search or a regular expression that cannot be read. */
export const findPattern = (query: FindQuery): RegExp | undefined => {
  if (query.search === '') {
    return undefined
  }
  const source = query.regex ? query.search : query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  try {
    return new RegExp(
      query.wholeWord ? `\\b(?:${source})\\b` : source,
      query.caseSensitive ? 'gu' : 'giu',
    )
  } catch {
    return undefined
  }
}

/** Where a query matches in a text, as `[from, to]` offsets, with no empty match. */
export const findRanges = (text: string, query: FindQuery): Array<[number, number]> => {
  const pattern = findPattern(query)
  if (!pattern) {
    return []
  }
  return [...text.matchAll(pattern)]
    .filter((match) => match[0] !== '')
    .map((match) => [match.index, match.index + match[0].length])
}

/**
 * Elements whose text is never searched: code, a template, a form field's own
 * value, and what is hidden from every reader. `hidden="until-found"` is
 * searched, as the browser's own find searches it.
 */
const NEVER =
  'script, style, template, noscript, textarea, select, [inert], [aria-hidden="true"], [hidden]:not([hidden="until-found"])'

/**
 * What stands between two blocks in the joined text. A match never runs
 * across it, so "end" at the close of one paragraph and "less" at the start of
 * the next are not "endless", and a whole word ends at a paragraph's end. No
 * search can type it.
 */
const BETWEEN = '\u0000'

/** The element a node is drawn under: the slot it is assigned to, or its parent, or the host of the root it is in. */
const flatParent = (node: Node): Element | null => {
  const slot = (node as Partial<Text>).assignedSlot
  if (slot) {
    return slot
  }
  const parent = node.parentNode
  if (parent?.nodeType === Node.ELEMENT_NODE) {
    return parent as Element
  }
  return parent !== null && 'host' in parent ? (parent as ShadowRoot).host : null
}

/**
 * Each element around `node` that hides it until a search finds it, outermost
 * first: `hidden="until-found"` anywhere above it, through slots and shadow
 * roots, and a closed `<details>` it is not the summary of.
 */
const revealers = (node: Node): Element[] => {
  const found: Element[] = []
  let below: Node = node
  for (let element = flatParent(node); element !== null; element = flatParent(element)) {
    const closed =
      element.localName === 'details' &&
      !(element as HTMLDetailsElement).open &&
      !(below instanceof Element && below.localName === 'summary')
    if (closed || element.getAttribute('hidden') === 'until-found') {
      found.unshift(element)
    }
    below = element
  }
  return found
}

/**
 * Whether a reader can see the text in `element`, or could once a search
 * opened what holds it.
 *
 * `checkVisibility()` looks through slots and shadow roots, so text slotted
 * into a closed tab panel is left out as the browser leaves it out. Text that
 * only `hidden="until-found"` or a closed `<details>` hides is in, where what
 * holds that is seen. Without `checkVisibility()`, as in a test DOM, a
 * `hidden` attribute anywhere above the text is what hides it.
 */
const seen = (element: Element): boolean => {
  if (typeof element.checkVisibility !== 'function') {
    for (let at: Element | null = element; at !== null; at = flatParent(at)) {
      const hidden = at.getAttribute('hidden')
      if (hidden !== null && hidden !== 'until-found') {
        return false
      }
    }
    return true
  }
  if (element.checkVisibility({ visibilityProperty: true })) {
    return true
  }
  const outer = revealers(element)[0]
  return (outer && flatParent(outer)?.checkVisibility({ visibilityProperty: true })) ?? false
}

/**
 * How an element's box lies in a line, as its `display` begins. Empty is
 * `inline`, the initial value, as a test DOM reports an element it has no
 * rule for.
 */
const INLINE = /^(?:inline|contents|ruby|$)/

/**
 * The nearest element around `text`, up to `root`, that is not laid out in a
 * line: the block the text is part of. Read from `display` once per element.
 */
const blockOf = (text: Text, root: Element, inline: Map<Element, boolean>): Element => {
  const view = root.ownerDocument.defaultView
  for (
    let element = text.parentElement;
    element !== null && element !== root;
    element = element.parentElement
  ) {
    let flows = inline.get(element)
    if (flows === undefined) {
      flows = view ? INLINE.test(view.getComputedStyle(element).display) : false
      inline.set(element, flows)
    }
    if (!flows) {
      return element
    }
  }
  return root
}

/**
 * Each text node under `root` a reader sees, with where it starts in their
 * joined text, and that text: blocks and line breaks parted by `BETWEEN`.
 */
const textsOf = (root: Element, skip: string): { joined: string; nodes: [Text, number][] } => {
  const nodes: [Text, number][] = []
  let joined = ''
  if (root.closest(NEVER)) {
    return { joined, nodes }
  }
  const never = skip === '' ? NEVER : `${NEVER}, ${skip}`
  const shown = new Map<Element, boolean>()
  const inline = new Map<Element, boolean>()
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (element.matches(never)) {
            return NodeFilter.FILTER_REJECT
          }
          return element.localName === 'br' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
        }
        const parent = node.parentElement
        if (parent === null || node.nodeValue === '') {
          return NodeFilter.FILTER_REJECT
        }
        let visible = shown.get(parent)
        if (visible === undefined) {
          visible = seen(parent)
          shown.set(parent, visible)
        }
        return visible ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
      },
    },
  )
  let block: Element | undefined
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      joined += BETWEEN
      continue
    }
    const text = node as Text
    const here = blockOf(text, root, inline)
    if (block !== undefined && here !== block) {
      joined += BETWEEN
    }
    block = here
    nodes.push([text, joined.length])
    joined += text.data
  }
  return { joined, nodes }
}

/** The text node holding character `at` of the joined text, and where in it, by halving. */
const placed = (nodes: [Text, number][], at: number, end: boolean): [Text, number] => {
  let low = 0
  let high = nodes.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const from = nodes[middle]?.[1] ?? 0
    // An end at a node's start belongs to the node before it.
    if (from < at || (!end && from === at)) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  const [node, from] = nodes[low] as [Text, number]
  return [node, at - from]
}

/**
 * Every place the text under `root` matches `query`, as ranges in the order
 * they come. A match may run across the elements inside one block, as
 * "**bold** words" does, and never from one block into the next.
 */
export const findTextRanges = (root: Element, query: FindQuery, skip = ''): Range[] => {
  if (findPattern(query) === undefined) {
    return []
  }
  const { joined, nodes } = textsOf(root, skip)
  return findRanges(joined, query)
    .filter(([from, to]) => !joined.slice(from, to).includes(BETWEEN))
    .map(([from, to]) => {
      const range = root.ownerDocument.createRange()
      range.setStart(...placed(nodes, from, false))
      range.setEnd(...placed(nodes, to, true))
      return range
    })
}

/**
 * The matches each finder has painted, so the union can be rebuilt when any
 * one of them changes: `CSS.highlights` is one registry for the document, as
 * `filter-marks` explains, and two Finds on one page both stay painted.
 */
const painted = new Map<object, { current: Range | undefined; others: Range[] }>()

/** Paints `owner`'s matches, the current one apart, or takes them away where there are none. */
const paint = (owner: object, ranges: readonly Range[], current: Range | undefined): void => {
  const registry = globalThis.CSS?.highlights
  if (registry === undefined) {
    return
  }
  if (ranges.length === 0) {
    painted.delete(owner)
  } else {
    painted.set(owner, { current, others: ranges.filter((range) => range !== current) })
  }
  const entries = [...painted.values()]
  const layers: Array<[string, Range[], number]> = [
    [FIND_MATCH, entries.flatMap((entry) => entry.others), 0],
    [FIND_CURRENT, entries.flatMap((entry) => (entry.current ? [entry.current] : [])), 1],
  ]
  for (const [name, ranges, priority] of layers) {
    if (ranges.length === 0) {
      registry.delete(name)
    } else {
      const highlight = new Highlight(...ranges)
      highlight.priority = priority
      registry.set(name, highlight)
    }
  }
}

/** Where a range starts against another's start: below 0 before it, 0 at it, above 0 after it. */
const against = (range: Range, anchor: Range): number => {
  try {
    return range.compareBoundaryPoints(Range.START_TO_START, anchor)
  } catch {
    return 1
  }
}

/**
 * The first match the reader can see, or the first below what they see:
 * where a search starts when no match is current yet.
 */
const firstInView = (ranges: readonly Range[], root: Element): number => {
  const top = Math.max(0, root.getBoundingClientRect().top)
  const at = ranges.findIndex(
    (range) =>
      typeof range.getBoundingClientRect === 'function' &&
      range.getBoundingClientRect().bottom > top,
  )
  return Math.max(at, 0)
}

/** Which match is current after a search, by `direction` from `anchor`, the one that was. */
const pick = (
  ranges: readonly Range[],
  anchor: Range | undefined,
  direction: FindDirection,
  root: Element,
): number => {
  if (ranges.length === 0) {
    return -1
  }
  if (anchor === undefined) {
    const first = firstInView(ranges, root)
    return direction === 'previous' ? (first - 1 + ranges.length) % ranges.length : first
  }
  const index =
    direction === 'previous'
      ? ranges.findLastIndex((range) => against(range, anchor) < 0)
      : ranges.findIndex((range) =>
          direction === 'next' ? against(range, anchor) > 0 : against(range, anchor) >= 0,
        )
  if (index !== -1) {
    return index
  }
  return direction === 'previous' ? ranges.length - 1 : 0
}

/** The nearest box around `element` that scrolls, through slots and shadow roots, or nothing for the page. */
const scrollerOf = (element: Element): Element | null => {
  const view = element.ownerDocument.defaultView
  for (let at = flatParent(element); at !== null; at = flatParent(at)) {
    if (at === element.ownerDocument.documentElement || at === element.ownerDocument.body) {
      return null
    }
    const overflow = view?.getComputedStyle(at).overflowY ?? ''
    if (/auto|scroll/.test(overflow) && at.scrollHeight > at.clientHeight) {
      return at
    }
  }
  return null
}

/**
 * Scrolls `range` into the middle of what scrolls it, unless it is already in
 * sight. Centered on its block, and then on itself where the block is taller
 * than the box, as a long code block is.
 */
const bringIntoView = (range: Range): void => {
  const element = range.startContainer.parentElement
  if (element === null || typeof range.getBoundingClientRect !== 'function') {
    return
  }
  const scroller = scrollerOf(element)
  const box = scroller?.getBoundingClientRect() ?? {
    bottom: innerHeight,
    left: 0,
    right: innerWidth,
    top: 0,
  }
  const rect = range.getBoundingClientRect()
  if (
    rect.top >= box.top &&
    rect.bottom <= box.bottom &&
    rect.left >= box.left &&
    rect.right <= box.right
  ) {
    return
  }
  element.scrollIntoView?.({ behavior: 'instant', block: 'center', inline: 'nearest' })
  const after = range.getBoundingClientRect()
  if (scroller && (after.top < box.top || after.bottom > box.bottom)) {
    scroller.scrollTop += after.top + after.height / 2 - (box.top + (box.bottom - box.top) / 2)
  }
}

/**
 * Opens what hides `range` until a search finds it, as the browser's own find
 * does: `beforematch` is sent to each `hidden="until-found"` element, which is
 * then shown, so Accordion opens the section it closed. A closed `<details>`
 * is opened. Returns whether anything was.
 */
const reveal = (range: Range): boolean => {
  const hiding = revealers(range.startContainer)
  for (const element of hiding) {
    if (element.localName === 'details') {
      ;(element as HTMLDetailsElement).open = true
    } else {
      element.dispatchEvent(new Event('beforematch', { bubbles: true }))
      if (element.getAttribute('hidden') === 'until-found') {
        element.removeAttribute('hidden')
      }
    }
  }
  return hiding.length > 0
}

/** How long the content stays still before a search runs again over what changed. */
const SETTLE = 150

/** What `textFinder` takes beside its root. */
export interface TextFinderOptions {
  /**
   * Called with where the search stands once the content has changed under
   * it, as a log that keeps writing does. A search that `find` returned is
   * not reported again here.
   */
  found?: ((result: FindResult) => void) | undefined
  /**
   * Elements under the root whose text is not searched, as a selector, such
   * as line numbers or the buttons beside each message.
   */
  skip?: string | undefined
}

/**
 * A finder over the text a reader sees under `root`, in its light DOM and
 * what is slotted there: Find's own, for the content its `for` names.
 *
 * Every match is painted as `helix-find-match`, and the current one as
 * `helix-find-current`, by the Custom Highlight API. The first search starts
 * at the first match in sight. The current match is scrolled into the middle
 * of its scroller unless it is already in sight, and what hides it until found
 * is opened first. While a search is open, a change to the content searches
 * again once it has been still for 150ms, staying on the current match, and
 * reports through `found`.
 *
 * Nothing is painted where the API is missing, as on a server or in a test
 * DOM, and the count is still right there.
 */
export const textFinder = (root: Element, options: TextFinderOptions = {}): Finder => {
  const owner = {}
  let ranges: Range[] = []
  let current: Range | undefined
  let query: FindQuery | undefined
  let observer: MutationObserver | undefined
  let settling: ReturnType<typeof setTimeout> | undefined

  const search = (direction: FindDirection, show: boolean): FindResult => {
    ranges = query ? findTextRanges(root, query, options.skip ?? '') : []
    const index = pick(ranges, current, direction, root)
    current = ranges[index]
    paint(owner, ranges, current)
    const shown = current
    if (shown && show) {
      if (reveal(shown)) {
        /* What opened draws on its next update, and is measured once it has. */
        setTimeout(() => bringIntoView(shown))
      } else {
        bringIntoView(shown)
      }
    }
    return { count: ranges.length, index }
  }

  const watch = (): void => {
    if (observer !== undefined || typeof MutationObserver === 'undefined') {
      return
    }
    observer = new MutationObserver(() => {
      clearTimeout(settling)
      settling = setTimeout(() => {
        if (query) {
          options.found?.(search('first', false))
        }
      }, SETTLE)
    })
    observer.observe(root, {
      attributeFilter: ['aria-hidden', 'hidden', 'inert'],
      characterData: true,
      childList: true,
      subtree: true,
    })
  }

  return {
    end() {
      observer?.disconnect()
      observer = undefined
      clearTimeout(settling)
      query = undefined
      ranges = []
      current = undefined
      paint(owner, ranges, current)
    },
    find(next, direction) {
      query = next
      watch()
      return search(direction, true)
    },
  }
}
