import type { Left } from './format.js'
import { filesOf } from './web-files.js'
import { tableOf } from './web-table.js'

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

/** The place in the set of the row a list of data holds focus on. */
const rowFocused = (mounted: Mounted): number | null => {
  const at = deepActive()
  const index =
    at instanceof HTMLElement && mounted.root.contains(at) ? at.dataset.index : undefined
  return index === undefined ? null : Number(index)
}

/** The words of the parts a line holds that a screen reader hears, with no spaces. */
const heardOfLine = (line: Element): string =>
  [
    ...(line.shadowRoot?.querySelectorAll('[part="level"], [part="text"], [part="count-label"]') ??
      []),
  ]
    .map((part) => part.textContent ?? '')
    .join('')
    .replace(/\s/g, '')

/** A part's words, with no spaces. */
const squeezed = (part: Element | null | undefined): string =>
  (part?.textContent ?? '').replace(/\s/g, '')

/** The block a tab shows, among those a code block holds, or the block itself. */
const shownBlock = (root: Element): Element => {
  const held = [...root.children].filter((child) => child.localName === root.localName)
  return held.find((child) => !child.hasAttribute('hidden')) ?? root
}

/** The code a block draws, in the slot that holds it or the lines it drew. */
const blockCode = (block: Element): string =>
  block.shadowRoot?.querySelector('[part="split"], [part="hunk"]') ? '' : squeezed(block)

/** What a code block says, as the record holds it. */
const codeBlockOf = (mounted: Mounted): NonNullable<Left['codeBlock']> => {
  const shadow = mounted.root.shadowRoot
  const shown = shownBlock(mounted.root)
  const inner = shown.shadowRoot
  const lineSelector = '[part="added"], [part="removed"], [part="context"]'
  return {
    code: blockCode(shown),
    copy: inner?.querySelector('[part="copy"]')?.getAttribute('label') ?? '',
    folds: [...(inner?.querySelectorAll('button[part="fold"]') ?? [])].map((fold) => ({
      expanded: fold.getAttribute('aria-expanded') === 'true',
      words: squeezed(fold),
    })),
    lines: [...(inner?.querySelectorAll(lineSelector) ?? [])].map((line) =>
      [...line.querySelectorAll('[part="marker"], [part="text"]')]
        .map((part) => squeezed(part))
        .join(''),
    ),
    pressed: inner?.querySelector('[part="wrap-toggle"]')?.getAttribute('aria-pressed') === 'true',
    tabs: [...(shadow?.querySelectorAll('[part="file-tab"]') ?? [])].map((tab) => ({
      selected: tab.getAttribute('aria-selected') === 'true',
      words: squeezed(tab),
    })),
  }
}

/** What each row of a log says, as the record holds it. */
const logRows = (mounted: Mounted): NonNullable<Left['log']> => {
  const shadow = mounted.root.shadowRoot
  return {
    dropped: (shadow?.querySelector('[part="dropped"]')?.textContent ?? '').trim(),
    rows: [...(shadow?.querySelectorAll('[part="row"] > *') ?? [])].map((row) => {
      const summary = row.shadowRoot?.querySelector('[part="summary"]')
      return summary
        ? {
            expanded: summary.getAttribute('aria-expanded') === 'true',
            words: (summary.textContent ?? '').replace(/\s/g, ''),
          }
        : { expanded: null, words: heardOfLine(row) }
    }),
    selected: String((mounted.root as { selectedLines?: unknown }).selectedLines ?? ''),
  }
}

/** A row of a feed, by what the record reads of it. */
interface FeedItem extends HTMLElement {
  readonly read: boolean
  readonly unreadLabel: string
}

/** What a feed of notifications says, as the record holds it. */
const feedOf = (mounted: Mounted): NonNullable<Left['feed']> => {
  const root = mounted.root as HTMLElement & { readonly items: readonly FeedItem[] }
  const shadow = root.shadowRoot
  const rows = root.items.filter((row) => row.assignedSlot !== null)
  const words = (row: FeedItem) =>
    [...row.childNodes]
      .filter((node) => !(node instanceof Element && node.hasAttribute('slot')))
      .map((node) => node.textContent ?? '')
      .join('')
  const at = rows.findIndex(
    (row) =>
      row.shadowRoot?.activeElement === row.shadowRoot?.querySelector('[part="item"]') &&
      row.shadowRoot?.activeElement !== null,
  )
  const group = root.querySelector('helix-notification-group')
  return {
    count: group?.shadowRoot?.querySelector('[part="count"]')?.textContent?.trim() ?? null,
    focused: at < 0 ? null : at,
    live: (shadow?.querySelector('[part="live"]')?.textContent ?? '').trim(),
    marksAll: shadow?.querySelector('[part="mark-all"]') !== null,
    more: shadow?.querySelector('[part="more"]') !== null,
    rows: rows.map((row) => `${row.read ? '' : row.unreadLabel}${words(row)}`.replace(/\s/g, '')),
    status: (
      shadow?.querySelector('[part="error"], [part="loading"], [part="empty"]')?.textContent ?? ''
    ).trim(),
  }
}

/** What each row of an object inspector says, as the record holds it. */
const inspectorRows = (mounted: Mounted): NonNullable<Left['inspector']> => {
  const shadow = mounted.root.shadowRoot
  const rows = [...(shadow?.querySelectorAll<HTMLElement>('[part~="row"]') ?? [])]
  const active = shadow?.activeElement as HTMLElement | null | undefined
  return {
    active: String((mounted.root as { active?: unknown }).active ?? ''),
    focused: active?.dataset?.index === undefined ? null : Number(active.dataset.index),
    matched: rows.flatMap((row, at) => (row.part.contains('row-match') ? [at] : [])).join(','),
    rows: rows.map((row) => {
      const expanded = row.getAttribute('aria-expanded')
      return {
        expanded: expanded === null ? null : expanded === 'true',
        level: Number(row.getAttribute('aria-level')),
        position: Number(row.getAttribute('aria-posinset')),
        size: Number(row.getAttribute('aria-setsize')),
        words: (row.textContent ?? '').replace(/\s/g, ''),
      }
    }),
  }
}

/** What a screen reader hears of each row a reader can reach in a tree. */
const treeRows = (mounted: Mounted): NonNullable<Left['tree']> =>
  [...mounted.items]
    .filter(([, item]) => {
      let up = item.parentElement
      while (up !== null && up !== mounted.root) {
        if (up.localName === item.localName && !isOpen(up)) {
          return false
        }
        up = up.parentElement
      }
      return true
    })
    .map(([value, item]) => {
      const row = item.shadowRoot?.querySelector('[role="treeitem"]')
      const said = (name: string) => row?.getAttribute(`aria-${name}`) ?? null
      const yes = (name: string) => (said(name) === null ? null : said(name) === 'true')
      return {
        checked: said('checked') === 'mixed' ? 'mixed' : yes('checked'),
        disabled: said('disabled') === 'true',
        expanded: yes('expanded'),
        level: Number(said('level')),
        position: Number(said('posinset')),
        selected: yes('selected'),
        size: Number(said('setsize')),
        value,
      }
    })

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
const OPENS: ReadonlySet<string> = new Set(['accordion', 'tree'])

/** The families that open a layer, whose record says whether it stands open. */
const LAYERS: ReadonlySet<string> = new Set([
  'color-input',
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
const TEXTS: ReadonlySet<string> = new Set([
  'object-inspector',
  'color-input',
  'input',
  'number-input',
  'pin-input',
  'textarea',
])

/**
 * The families a reader moves along a track or picks a score in, whose
 * record says the value they hold and whether they are marked wrong.
 */
const VALUES: ReadonlySet<string> = new Set(['color-picker', 'rating', 'slider'])

/** What the element's field holds, and whether the element is marked wrong. */
const textOf = (mounted: Mounted): { readonly invalid: boolean; readonly value: string } => {
  const control = mounted.root.shadowRoot?.querySelector(
    '[part~="control"], [part~="search-field"]',
  )
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
  ...(family === 'tree' ? { tree: treeRows(mounted) } : {}),
  ...(family === 'object-inspector' ? { inspector: inspectorRows(mounted) } : {}),
  ...(family === 'log' ? { log: logRows(mounted) } : {}),
  ...(family === 'code-block' ? { codeBlock: codeBlockOf(mounted) } : {}),
  /* A row holds no value, so a row with focus is named by the feed it stands in. */
  ...(family === 'notifications'
    ? {
        feed: feedOf(mounted),
        focused: mounted.root.matches(':focus-within') ? mounted.root.localName : null,
      }
    : {}),
  ...(family === 'table' ? { table: tableOf(mounted.root) } : {}),
  /* What a list of data holds: the keys chosen, and the row with focus. */
  ...(family === 'virtual-list'
    ? {
        window: {
          chosen: String((mounted.root as { value?: unknown }).value ?? ''),
          focused: rowFocused(mounted),
        },
      }
    : {}),
  /* A file input's files, by name, and whether it is marked wrong. */
  ...(family === 'file-input'
    ? { files: filesOf(mounted), invalid: inState(mounted.root, 'invalid') }
    : {}),
})

/** Where a copy stands, by the web's states: `copied`, `failed`, or `resting`. */
const resultOf = (element: Element): 'copied' | 'failed' | 'resting' =>
  inState(element, 'copied') ? 'copied' : inState(element, 'failed') ? 'failed' : 'resting'

/** How a picture stands, by the web's states: `loaded`, `error`, or `loading`. */
const stateOf = (element: Element): 'error' | 'loaded' | 'loading' =>
  inState(element, 'loaded') ? 'loaded' : inState(element, 'error') ? 'error' : 'loading'
