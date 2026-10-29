import type { Left } from './format.js'

/*
 * What an intent left in the page, read from the elements a setup mounted:
 * the items chosen and open, the element checked, where focus is, and how a
 * picture stands.
 */

export type Updatable = HTMLElement & { readonly updateComplete?: Promise<unknown> }

/** A setup as the page holds it: the element, its items and panels by value. */
export interface Mounted {
  readonly items: ReadonlyMap<string, Updatable>
  readonly panels: ReadonlyMap<string, Updatable>
  readonly root: Updatable
}

/** The element in the page that holds focus, through every shadow root. */
export const deepActive = (): Element | null => {
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement
  }
  return active
}

/** The element that holds `node`, crossing out of a shadow root to its host. */
const above = (node: Node): Node | null =>
  node.parentNode instanceof ShadowRoot ? node.parentNode.host : node.parentNode

/** Whether an element is in a custom state, or `false` where the engine cannot say. */
const inState = (element: Element, name: string): boolean => {
  try {
    return element.matches(`:state(${name})`)
  } catch {
    return false
  }
}

/** What the setup holds focus on: an item's value, the element's tag, `page`, or `null`. */
const focusedIn = (mounted: Mounted): string | null => {
  if (deepActive()?.hasAttribute('data-conformance-page') === true) {
    return 'page'
  }
  const owners = new Map<Node, string>([[mounted.root, mounted.root.localName]])
  for (const [value, item] of mounted.items) {
    owners.set(item, value)
  }
  for (let at: Node | null = deepActive(); at !== null; at = above(at)) {
    const owner = owners.get(at)
    if (owner !== undefined) {
      return owner
    }
  }
  return null
}

/** The families whose element turns on and off, whose record says whether it is checked. */
const TOGGLES: ReadonlySet<string> = new Set(['checkbox', 'motion-toggle', 'switch', 'toggle'])

/**
 * Whether an element that turns on and off is checked, on, pressed, or
 * paused, by the custom state its family names it with, or `mixed` while it
 * is indeterminate.
 */
const checkedOf = (element: Element): boolean | 'mixed' =>
  inState(element, 'indeterminate')
    ? 'mixed'
    : ['checked', 'paused', 'pressed'].some((name) => inState(element, name))

/** The families whose items open and close, whose record says which stand open. */
const OPENS: ReadonlySet<string> = new Set(['accordion'])

/** The families that open a layer, whose record says whether it stands open. */
const LAYERS: ReadonlySet<string> = new Set([
  'dialog',
  'drawer',
  'megamenu',
  'menu',
  'popover',
  'speed-dial',
  'tooltip',
  'tour',
])

/** The families that show one stop at a time, whose record says which stop shows. */
const TOURS: ReadonlySet<string> = new Set(['tour'])

/** The families that copy, whose record says where the last copy stands. */
const COPIES: ReadonlySet<string> = new Set(['copy-button'])

/** The families that show one page of rows at a time, whose record says which rows are drawn. */
const STACKS: ReadonlySet<string> = new Set(['drilldown', 'menu'])

/** The families that draw a picture, whose record says how it stands. */
const IMAGES: ReadonlySet<string> = new Set(['image'])

/** The families that hold themselves back for a delay, whose record says whether they wait. */
const WAITS: ReadonlySet<string> = new Set(['loader'])

/** The families whose items say themselves which is current, whose record says which do. */
const MARKS: ReadonlySet<string> = new Set(['megamenu', 'navigation'])

/** Whether an item's link says it is current, as `aria-current` does. */
const currentItem = (item: Element): boolean => {
  const said = item.shadowRoot?.querySelector('[part~="link"]')?.getAttribute('aria-current')
  return said !== null && said !== undefined && said !== 'false'
}

/** The families whose words are their reading, whose record says what they read. */
const READS: ReadonlySet<string> = new Set(['format-date', 'timeline'])

/** The families a reader types into, whose record says what the field holds. */
const TEXTS: ReadonlySet<string> = new Set(['input', 'number-input', 'pin-input', 'textarea'])

/**
 * The families a reader moves along a track or picks a score in, whose
 * record says the value they hold and whether they are marked wrong.
 */
const VALUES: ReadonlySet<string> = new Set(['rating', 'slider'])

/** What the element's field holds, and whether the element is marked wrong. */
const textOf = (mounted: Mounted): { readonly invalid: boolean; readonly value: string } => {
  const control = mounted.root.shadowRoot?.querySelector('[part~="control"]')
  const value =
    control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement
      ? control.value
      : ''
  return { invalid: inState(mounted.root, 'invalid'), value }
}

/** Whether an element that opens stands open, as its `open` property says. */
export const isOpen = (element: Element): boolean =>
  (element as { readonly open?: unknown }).open === true

/**
 * Whether an item is a row drawn on the page showing: a family whose rows
 * stand in a layer draws none while the layer is closed, as a phone draws
 * none, and a row on a page that is not showing draws no press.
 */
const drawnRow = (mounted: Mounted, family: string, item: Element): boolean =>
  (!LAYERS.has(family) || inState(mounted.root, 'open')) &&
  item.shadowRoot?.querySelector('[part="item"]') != null

/**
 * What the setup shows now. An item the page removed is no longer chosen,
 * and in a stack of pages a row is chosen only where it is drawn, since a
 * phone reads a choice from the press it draws.
 */
export const leftBy = (mounted: Mounted, opened: readonly string[], family: string): Left => ({
  ...(TOGGLES.has(family) ? { checked: checkedOf(mounted.root) } : {}),
  ...(IMAGES.has(family) ? { loaded: stateOf(mounted.root) } : {}),
  ...(LAYERS.has(family) ? { layer: inState(mounted.root, 'open') } : {}),
  ...(OPENS.has(family)
    ? { open: [...mounted.items].filter(([, item]) => isOpen(item)).map(([v]) => v) }
    : {}),
  chosen: [...mounted.items]
    .filter(([, item]) => item.isConnected)
    .filter(([, item]) => !STACKS.has(family) || drawnRow(mounted, family, item))
    .filter(([, item]) => ['checked', 'pressed', 'selected'].some((name) => inState(item, name)))
    .map(([v]) => v),
  /* An item a closed layer holds is drawn on no phone, so it is current in neither record. */
  ...(MARKS.has(family)
    ? {
        current: [...mounted.items]
          .filter(() => !LAYERS.has(family) || inState(mounted.root, 'open'))
          .filter(([, item]) => currentItem(item))
          .map(([v]) => v),
      }
    : {}),
  focused: focusedIn(mounted),
  opened: [...opened],
  ...(COPIES.has(family) ? { result: resultOf(mounted.root) } : {}),
  ...(READS.has(family)
    ? { reads: mounted.root.shadowRoot?.querySelector('[part="time"]')?.textContent ?? '' }
    : {}),
  ...(STACKS.has(family)
    ? {
        rows: [...mounted.items]
          .filter(([, item]) => drawnRow(mounted, family, item))
          .map(([v]) => v),
      }
    : {}),
  /* A tour shows the stop it writes `current` on, and a set shows its selected panels. */
  shown: TOURS.has(family)
    ? [...mounted.items]
        .filter(([, item]) => (item as { readonly current?: unknown }).current === true)
        .map(([v]) => v)
    : [...mounted.panels].filter(([, panel]) => inState(panel, 'selected')).map(([v]) => v),
  ...(TEXTS.has(family) ? { text: textOf(mounted) } : {}),
  ...(VALUES.has(family)
    ? {
        invalid: inState(mounted.root, 'invalid'),
        value: String((mounted.root as { value?: unknown }).value),
      }
    : {}),
  /* A splitter's value is where its divider stands, as a screen reader hears it. */
  ...(family === 'splitter'
    ? {
        invalid: false,
        value: String(Math.round(Number((mounted.root as { position?: unknown }).position))),
      }
    : {}),
  ...(WAITS.has(family) ? { waiting: inState(mounted.root, 'waiting') } : {}),
})

/** Where a copy stands, by the web's states: `copied`, `failed`, or `resting`. */
const resultOf = (element: Element): 'copied' | 'failed' | 'resting' =>
  inState(element, 'copied') ? 'copied' : inState(element, 'failed') ? 'failed' : 'resting'

/** How a picture stands, by the web's states: `loaded`, `error`, or `loading`. */
const stateOf = (element: Element): 'error' | 'loaded' | 'loading' =>
  inState(element, 'loaded') ? 'loaded' : inState(element, 'error') ? 'error' : 'loading'
