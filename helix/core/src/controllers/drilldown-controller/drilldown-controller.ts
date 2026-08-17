import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** How the controller is told what it is drilling through. */
export interface DrilldownOptions {
  /**
   * Whether an element counts as a row.
   *
   * Defaults to any element. A container holding things other than rows says so
   * here, rather than the controller guessing from a tag name it cannot know.
   */
  isRow?: (element: Element) => boolean
  /** The rows of the top page, in the order a reader moves through them. */
  root: () => Element[]
  /**
   * The slot a row's own page is assigned to. Defaults to `page`.
   *
   * The nesting is the structure: a row that opens a page *contains* that
   * page's rows. There are no ids to wire and nothing to keep in step, and a
   * consumer who moves a row in the markup has moved its page with it.
   */
  slot?: string
}

/**
 * One page of a nested set showing at a time, with a way back.
 *
 * A drill-down replaces the panel rather than opening a second one beside it.
 * That is the right shape wherever there is no room for two: on a phone there
 * is no second column, and on a touch screen there is no hover to open one
 * with. What a reader gets instead is one panel, a title saying where they are,
 * and a way back.
 *
 * **Extracted from `Menu`, which had all of this and did not say so.** The menu
 * held a `page`, derived the rows on it, read a title off the row that opened
 * it, and reset on close; the sandbox's settings dropdown has been a drill-down
 * for as long as it has existed. None of that is about menus. Taking it out is
 * what lets a settings panel, a filter stack or a navigation tree have the same
 * behavior without one of them being a menu that is pretending.
 *
 * **The tree is the state.** A row's page is its own children, assigned to a
 * slot, so the controller holds one reference, the row currently drilled into,
 * and derives everything else from the DOM. The alternative, an id per page and
 * a map beside it, is a second copy of the structure that a consumer can put
 * out of step with the first.
 *
 * **A stack, not a pointer.** `back()` returns to the page above rather than to
 * the root, because a reader three levels down pressed one control and expects
 * one level. The stack is rebuilt from the DOM by walking up from the current
 * row, so it cannot disagree with the tree: a page removed while it was showing
 * takes its ancestors with it, and `atRoot` becomes true rather than the
 * controller holding a reference to something detached.
 *
 * Nothing here decides what a row *is*, what it renders, or what happens when
 * one is chosen. It answers where the reader is and what is on this page.
 */
export class DrilldownController<Row extends Element = Element> implements ReactiveController {
  private readonly host: ReactiveControllerHost

  private readonly options: DrilldownOptions

  /** The row whose page is showing, or nothing at the top. */
  private current: Row | null = null

  constructor(host: ReactiveControllerHost, options: DrilldownOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  /** The row whose page is showing, or `null` at the top. */
  get page(): Row | null {
    return this.current
  }

  /** Whether the top page is the one showing. */
  get atRoot(): boolean {
    return this.current === null
  }

  /**
   * How deep the reader is, with the top page at zero.
   *
   * Counted by walking up rather than by keeping a number, for the reason the
   * stack is: a count can be wrong about a tree, and the tree is what renders.
   */
  get depth(): number {
    let depth = 0
    for (let row = this.current; row; row = this.parentOf(row)) {
      depth += 1
    }
    return depth
  }

  /**
   * What the page showing is called.
   *
   * The row's own text and not its subtree, because a row that opens a page
   * contains that page's rows: `textContent` would read back the whole thing.
   * Empty at the top, where the panel's own label is the name of the place.
   */
  get label(): string {
    return [...(this.current?.childNodes ?? [])]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
  }

  /** The rows on the page showing, which is what the keyboard moves over. */
  get rows(): Row[] {
    const slot = this.options.slot ?? 'page'
    const isRow = this.options.isRow ?? (() => true)
    const source = this.current
      ? [...this.current.children].filter((child) => child.slot === slot)
      : this.options.root()
    return source.filter(isRow) as Row[]
  }

  /** Whether a row has a page to drill into. */
  hasPage(row: Element): boolean {
    const slot = this.options.slot ?? 'page'
    return [...row.children].some((child) => child.slot === slot)
  }

  /**
   * Shows a row's page in place of the one showing.
   *
   * Refuses a row with no page rather than drilling into an empty one, which
   * would leave a reader on a blank panel with a back control as its only
   * content and nothing saying why.
   */
  enter(row: Row): boolean {
    if (!this.hasPage(row)) {
      return false
    }
    this.current = row
    this.host.requestUpdate()
    return true
  }

  /** Returns to the page above, and reports whether there was one. */
  back(): boolean {
    if (this.current === null) {
      return false
    }
    this.current = this.parentOf(this.current)
    this.host.requestUpdate()
    return true
  }

  /**
   * Returns to the top page.
   *
   * For closing rather than for navigating: a panel that reopens where it was
   * left is showing a reader a place they have no memory of choosing.
   */
  reset(): void {
    if (this.current === null) {
      return
    }
    this.current = null
    this.host.requestUpdate()
  }

  /**
   * The row that opened the page this row is on.
   *
   * Walks up two steps, because a row sits inside the row that opened it: its
   * parent element *is* that row. Read from the DOM each time rather than
   * stored, so a tree the consumer has changed cannot leave this pointing at
   * something no longer in it.
   */
  private parentOf(row: Row): Row | null {
    const slot = this.options.slot ?? 'page'
    if (row.slot !== slot) {
      return null
    }
    const parent = row.parentElement
    return parent && (this.options.isRow ?? (() => true))(parent)
      ? (parent as unknown as Row)
      : null
  }

  /** Back to the top when the host goes away, so it reopens where it opened. */
  hostDisconnected(): void {
    this.current = null
  }
}
