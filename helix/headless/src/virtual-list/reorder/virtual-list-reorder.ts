import { ReorderController } from '@fusion.dev/helix-core'
import type { CSSResult, ReactiveController } from 'lit'
import type { HelixHeadlessVirtualList } from '../root/virtual-list-root.js'

/**
 * The words a reader hears as an item moves, each read from an attribute of
 * the list, with the English it falls back to. `{name}` is the item's words,
 * and `{position}` and `{count}` say where it went.
 */
const WORDS = {
  canceledLabel: ['canceled-label', 'Canceled'],
  droppedLabel: ['dropped-label', 'Dropped'],
  movedLabel: ['moved-label', '{name} moved to position {position} of {count}'],
  pickedUpLabel: ['picked-up-label', 'Picked up {name}'],
} as const

/** The marks a row takes in a move, as data attributes, since a row is your element. */
const MOVES = ['dragging', 'drop-after', 'drop-before'] as const

/**
 * Moves the items of a `reorderable` virtual list, by pointer and by keyboard,
 * and says each move in a region screen readers announce.
 *
 * **Its own entry**, `@fusion.dev/helix-headless/virtual-list/reorder`, so a
 * list that never moves items carries none of this. Importing the entry gives
 * every virtual list one, and `reorderable` turns it on.
 *
 * - **Alt with Up or Down** moves the item the keys are on a place at once,
 *   and Alt with Home or End to either end, as the APG's rearrangeable
 *   listbox does. Across, Alt with Left or Right does, mirrored right to left.
 *   The keys stay on the item that moved.
 * - **A pointer** drags a whole row, with no grip: a press that travels is a
 *   drag, and one that does not is still a press. The list scrolls near an
 *   edge.
 * - **The page moves the items.** A drop sends `helix-before-reorder` and then
 *   `helix-reorder` with every key in the new order.
 *
 * A row being dragged carries `data-dragging`, and the row a drop would land
 * beside `data-drop-before` or `data-drop-after`. While a pointer drags a row,
 * a copy of it follows the pointer in the list's `drag-preview` part. The
 * styled tier's entry hands in the sheet that draws those, which the list
 * adopts while it reorders.
 */
export class VirtualListReorderController implements ReactiveController {
  private readonly host: HelixHeadlessVirtualList

  /** The sheet the list adopts while it reorders, from the styled tier. */
  sheet: CSSResult | undefined

  /** The rows marked last, so a mark that moves is taken off where it was. */
  private marked = new Set<HTMLElement>()

  /** The region each move is said in, drawn while the list reorders. */
  private live: HTMLElement | undefined

  private readonly reorder: ReorderController

  constructor(host: HelixHeadlessVirtualList, sheet?: CSSResult) {
    this.host = host
    this.sheet = sheet
    host.addController(this)
    this.reorder = new ReorderController(host, {
      get axis() {
        return host.orientation === 'horizontal' ? 'inline' : 'block'
      },
      box: (key) => this.rowFor(key)?.getBoundingClientRect(),
      current: () => {
        const row = this.rows.find((one) => one.hasAttribute('data-active'))
        return row && !row.hasAttribute('data-disabled') ? this.keyOf(row) : undefined
      },
      enabled: () => this.enabled,
      grip: (event) => {
        const row = this.rowOf(event)
        const key = row && !row.hasAttribute('data-disabled') ? this.keyOf(row) : undefined
        return row && key !== undefined ? { element: row, key } : undefined
      },
      holds: false,
      keys: () => host.keys(),
      name: (key) => this.names.get(key) || key,
      preview: (key) => this.rowFor(key),
      say: (words) => {
        if (this.live) {
          this.live.textContent = words
        }
      },
      scroller: () => host.renderRoot?.querySelector<HTMLElement>('[part="viewport"]') ?? null,
    })
  }

  /** Whether the list moves its items now: one column, without sections. */
  private get enabled(): boolean {
    const host = this.host
    return (
      host.reorderable && host.columns <= 1 && host.minColumnWidth <= 0 && host.sectionField === ''
    )
  }

  /**
   * The words of each drawn row by its item's key, as they were when the list
   * last drew. A move is said after the page has moved the items and before
   * the rows are drawn again, so a row's own words then belong to another item.
   */
  private names = new Map<string, string>()

  hostUpdated(): void {
    queueMicrotask(() => this.mark())
  }

  hostConnected(): void {
    this.host.addEventListener('helix-reorder', this.handleReorder)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('helix-reorder', this.handleReorder)
    this.waiting = undefined
  }

  /** The rows the list draws now. */
  private get rows(): HTMLElement[] {
    return [...this.host.querySelectorAll<HTMLElement>(':scope > [data-index]')]
  }

  /** The key of the item a row draws. */
  private keyOf(row: HTMLElement): string | undefined {
    const at = Number(row.dataset.index)
    return Number.isInteger(at) ? this.host.keys()[at] : undefined
  }

  /** The row that draws the item with that key, where one is drawn. */
  private rowFor(key: string): HTMLElement | undefined {
    const at = this.host.keys().indexOf(key)
    return at < 0
      ? undefined
      : (this.host.querySelector<HTMLElement>(`:scope > [data-index="${at}"]`) ?? undefined)
  }

  /** The row an event passed through. */
  private rowOf(event: Event): HTMLElement | undefined {
    const rows = this.rows
    return event
      .composedPath()
      .find((node): node is HTMLElement => rows.includes(node as HTMLElement))
  }

  /** The place an item moved by a key goes to, until the page has moved it. */
  private waiting: number | undefined

  /**
   * Keeps the keys on the item that moved. The page moves the items as it
   * hears this, and the rows are drawn again in place, so the row that had
   * focus now draws another item. Focus goes to the item's new row once the
   * list has drawn it.
   */
  private readonly handleReorder = (event: Event): void => {
    const { to } = (event as CustomEvent<{ to: number }>).detail
    const focused = this.host.contains(document.activeElement)
    if (!focused) {
      return
    }
    this.waiting = to
    setTimeout(() => {
      const at = this.waiting
      this.waiting = undefined
      if (at !== undefined && !event.defaultPrevented && this.host.isConnected) {
        void this.host.focusIndex(at)
      }
    }, 0)
  }

  /**
   * Draws the list's `drag-preview` part and its region for the words while it
   * reorders, and takes them away after. The list's own template draws
   * neither.
   */
  private draw(on: boolean): void {
    const root = this.host.renderRoot
    if (!root) {
      return
    }
    const drawn = root.querySelector('[part="drag-preview"]')
    if (on && !drawn) {
      const preview = document.createElement('div')
      for (const [name, value] of [
        ['part', 'drag-preview'],
        ['popover', 'manual'],
        ['aria-hidden', 'true'],
        ['inert', ''],
      ]) {
        preview.setAttribute(name as string, value as string)
      }
      const live = document.createElement('span')
      live.setAttribute('role', 'status')
      live.setAttribute('data-reorder-live', '')
      root.append(preview, live)
      this.live = live
    } else if (!on && drawn) {
      drawn.remove()
      this.live?.remove()
      this.live = undefined
    }
  }

  /** Puts each row's mark in a move on it, and the styled tier's sheet on the list. */
  private mark(): void {
    const on = this.enabled
    adopt(this.host, this.sheet, on)
    this.draw(on)
    const marked = new Set<HTMLElement>()
    this.names = new Map()
    for (const row of this.rows) {
      const key = on ? this.keyOf(row) : undefined
      if (key !== undefined) {
        this.names.set(key, row.textContent?.trim() ?? '')
      }
      const move = key === undefined ? undefined : this.reorder.moveOf(key)
      if (move || this.marked.has(row)) {
        for (const one of MOVES) {
          row.toggleAttribute(`data-${one}`, one === move)
        }
      }
      if (move) {
        marked.add(row)
      }
    }
    for (const row of this.marked) {
      if (!marked.has(row)) {
        for (const one of MOVES) {
          row.removeAttribute(`data-${one}`)
        }
      }
    }
    this.marked = marked
  }
}

/** Gives the list a sheet of the styled tier while it reorders, and takes it back after. */
const adopt = (element: Element, given: CSSResult | undefined, on: boolean): void => {
  const root = element.shadowRoot
  const sheet = given?.styleSheet
  if (!root || !sheet || root.adoptedStyleSheets.includes(sheet) === on) {
    return
  }
  root.adoptedStyleSheets = on
    ? [...root.adoptedStyleSheets, sheet]
    : root.adoptedStyleSheets.filter((one) => one !== sheet)
}

/** The controller each list was given, so a class given one twice gives each list one. */
const given = new WeakMap<HelixHeadlessVirtualList, VirtualListReorderController>()

/** Gives a list its controller, once, and the styled tier's sheet where it has none yet. */
const attach = (list: HelixHeadlessVirtualList, sheet: CSSResult | undefined): void => {
  const controller = given.get(list) ?? new VirtualListReorderController(list)
  given.set(list, controller)
  controller.sheet ??= sheet
}

/**
 * The elements of a class already on the page, in the document and in every
 * open shadow root in it.
 */
const onPage = <T extends Element>(
  of: abstract new (...args: never[]) => T,
  root: ParentNode = document,
): T[] =>
  [...root.querySelectorAll('*')].flatMap((node) => [
    ...(node instanceof of ? [node] : []),
    ...(node.shadowRoot ? onPage(of, node.shadowRoot) : []),
  ])

/**
 * Gives every virtual list of a class a `VirtualListReorderController`, and
 * the class the words it says, as properties that read and write their
 * attributes: `movedLabel`, `canceledLabel`, `droppedLabel`, and
 * `pickedUpLabel`.
 *
 * The entries call it for their own tier's class: the headless entry for
 * `HelixHeadlessVirtualList`, and the styled one for `HelixVirtualList`, with
 * the sheet that draws a move. **Lists already on the page are given one
 * too**, so a page that imports the list and then this entry has its lists
 * reorder.
 */
export const reorderVirtualList = (
  element: typeof HelixHeadlessVirtualList,
  sheet?: CSSResult,
): void => {
  element.addInitializer((host) => attach(host as HelixHeadlessVirtualList, sheet))
  if (typeof document !== 'undefined') {
    for (const list of onPage(element)) {
      attach(list, sheet)
      list.requestUpdate()
    }
  }
  const proto = element.prototype
  for (const [name, [attribute, fallback]] of Object.entries(WORDS)) {
    if (name in proto) {
      continue
    }
    Object.defineProperty(proto, name, {
      configurable: true,
      get(this: HTMLElement): string {
        return this.getAttribute(attribute) ?? fallback
      },
      set(this: HTMLElement, next: string): void {
        this.setAttribute(attribute, next)
      },
    })
  }
}
