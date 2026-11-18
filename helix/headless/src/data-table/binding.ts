/**
 * How a tool bound to a Data Table by `for` finds the table and hears it
 * change: the Column Manager, the Quick Filters, the Table Export, the
 * Selection Bar and the View Drawer.
 *
 * **By shape, and this module registers nothing.** A tool reads the table
 * through the methods it calls, so a page that writes a tool and a table
 * imports both, and a tool's entry does not carry the table's code.
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { DataTableView, Facet, PartialView } from './view.js'

/** One column of a bound table, as a tool reads it. */
export interface ToolColumn extends HTMLElement {
  readonly field: string
  readonly filterable: boolean
  minTableWidth: string
  readonly shown: boolean
  readonly sortable: boolean
  readonly type?: string | undefined
}

/** What a tool needs of the table it is bound to. */
export interface ToolTable extends HTMLElement, ReactiveControllerHost {
  /** The fields left out at the table's width, for their `min-table-width`. */
  readonly droppedFields: readonly string[]
  /** Every row before the search and the filters narrow them. */
  readonly everyRowCount: number
  facetsOf(field: string): Facet[]
  /**
   * How many rows a partial view would show, from the rows the table holds,
   * or nothing in `server` mode, where the table holds one page.
   */
  countView(part: PartialView): number | undefined
  /** How many rows pass the search and the filters. */
  readonly matched: number
  requestView(next: PartialView): boolean
  /** The keys of the selected rows, separated by commas. */
  selected: string
  selectRows(keys: readonly string[]): boolean
  /** The sort order, as `field:direction`. */
  sort: string
  readonly tableColumns: readonly ToolColumn[]
  readonly view: DataTableView
}

/** Whether an element is a Data Table a tool can bind to. */
export const isToolTable = (element: Element | null): element is ToolTable =>
  element !== null &&
  typeof (element as Partial<ToolTable>).requestView === 'function' &&
  typeof (element as Partial<ToolTable>).countView === 'function'

/** A column's name as a reader sees it: its heading, or its field where it has none. */
export const columnName = (column: ToolColumn): string => column.textContent?.trim() || column.field

/** The host a binding serves: an element with a `for`. */
type BoundHost = ReactiveControllerHost & HTMLElement & { for: string }

/**
 * Finds the table a tool's `for` names, in the tool's own tree, and asks the
 * tool to draw again whenever the table does.
 *
 * **Looked up on every read**, so a table defined after the tool, or one that
 * replaces another under the same id, is found the next time the tool draws.
 * **And watched for until it is there.** A tool parsed before its table, on a
 * page whose elements are defined before the parser reaches the table, found
 * nothing when it connected and had no reason to draw again: November 17,
 * 2026, a Table Export written above its table read "Export 0 rows" for good.
 * So while the id names nothing, the binding watches the tool's tree for it,
 * and stops once it appears.
 *
 * **A controller on the table, and no events.** A page that sets `view` or
 * `selected` fires nothing, and a table that leaves a column out at a narrow
 * width fires nothing either, and each is something a tool shows. So the
 * binding adds a controller to the table, whose `hostUpdated` runs after every
 * update the table makes, as Checkbox Group hears its boxes.
 */
export class TableBinding implements ReactiveController {
  private heard: ToolTable | null = null

  /** Whether the tool has drawn once, after which it looks for the table. */
  private drawn = false

  /** Watches the tool's tree while its `for` names nothing in it. */
  private watching: MutationObserver | undefined

  /** The tag the binding is waiting to see defined, so it asks once. */
  private defining = ''

  /** What the binding adds to the table it follows. */
  private readonly watcher: ReactiveController = {
    hostUpdated: () => this.host.requestUpdate(),
  }

  constructor(private readonly host: BoundHost) {
    host.addController(this)
  }

  /**
   * The table, once it is in the tree and defined, or nothing. Without a
   * `for`, a tool written inside a table, as a Selection Bar in its
   * `selection` slot is, takes that table.
   */
  get table(): ToolTable | null {
    /* None on the first render, which hydrates what a server sent and has to
       be the server's, and the server drew no table. The render after finds
       it, since the binding asks for one once the first is done. */
    if (typeof document === 'undefined' || !this.drawn) {
      return null
    }
    if (this.host.for === '') {
      const parent = this.host.parentElement
      return isToolTable(parent) ? parent : null
    }
    const scope = this.host.getRootNode() as Document | ShadowRoot
    const found = scope.getElementById?.(this.host.for) ?? null
    return isToolTable(found) ? found : null
  }

  hostConnected(): void {
    this.listen()
    this.await()
  }

  hostDisconnected(): void {
    this.stopWatching()
    this.follow(null)
  }

  hostUpdated(): void {
    this.drawn = true
    this.listen()
    if (!this.heard) {
      this.await()
    }
  }

  /**
   * Asks the tool to draw again once the table it names is there and defined:
   * when the id appears in its tree, and when the table's tag is defined. A
   * table defined after the tool upgrades with no event the tool can hear.
   */
  private await(): void {
    if (
      this.host.for === '' ||
      typeof customElements === 'undefined' ||
      typeof MutationObserver === 'undefined'
    ) {
      return
    }
    const scope = this.host.getRootNode() as Document | ShadowRoot
    const target = scope.getElementById?.(this.host.for)
    /* There already: the draw under way reads it, or its tag's definition is
       awaited. Drawing again here, on every update, would never stop where
       the id names something that is not a table. */
    if (target) {
      this.stopWatching()
      this.awaitDefined(target, false)
      return
    }
    if (this.watching) {
      return
    }
    this.watching = new MutationObserver(() => {
      const found = scope.getElementById?.(this.host.for)
      if (found) {
        this.stopWatching()
        this.awaitDefined(found, true)
      }
    })
    this.watching.observe(scope, { childList: true, subtree: true })
  }

  /**
   * Draws the tool again once the table's tag is defined, or now where it
   * just appeared already defined.
   */
  private awaitDefined(target: Element, appeared: boolean): void {
    const tag = target.localName
    if (!tag.includes('-') || customElements.get(tag)) {
      if (appeared) {
        this.host.requestUpdate()
      }
      return
    }
    if (this.defining === tag) {
      return
    }
    this.defining = tag
    void customElements.whenDefined(tag).then(() => {
      this.defining = ''
      this.host.requestUpdate()
    })
  }

  private stopWatching(): void {
    this.watching?.disconnect()
    this.watching = undefined
  }

  private listen(): void {
    this.follow(this.table)
  }

  private follow(table: ToolTable | null): void {
    if (table === this.heard) {
      return
    }
    this.heard?.removeController(this.watcher)
    table?.addController(this.watcher)
    this.heard = table
    if (table) {
      this.host.requestUpdate()
    }
  }
}
