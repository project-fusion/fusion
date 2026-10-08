import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { auditData, auditSource } from '#audit-source'
import { elementById, searchableById } from '../../utils/element-by-id/element-by-id.js'
import {
  type ChartData,
  isChartData,
  rowsFromData,
  seriesFromData,
} from '../../utils/read-data/read-data.js'
import {
  type Row,
  readRows,
  readSeries,
  type Series,
  seriesKey,
} from '../../utils/read-series/read-series.js'
import { wordsLocale } from '../../words/words-locale.js'

/** A parse, and the table and edit it was made from. */
interface Parsed<T> {
  /**
   * The data it was read from, where there was no table.
   */
  data: ChartData | undefined
  /**
   * The table it was read from, or null where there was none.
   */
  element: Element | null
  /**
   * What the read gave.
   */
  value: T
  /**
   * Which edit of the table it saw.
   */
  version: number
}

/**
 * The series hidden on each table, by lowercased name, which a legend writes
 * and every chart reading the table draws without.
 *
 * **Keyed by the table, because the table is the one thing a legend and a
 * chart share.** Each names it with `for` and neither names the other, so a
 * legend cannot find the charts it keys and a chart cannot find its legend.
 * Both find the table. Weak, so a table a page removes takes its entry with it.
 */
const HIDDEN = new WeakMap<Element, ReadonlySet<string>>()

/** Every controller reading a table, so a change to what is hidden redraws each. */
const READERS = new WeakMap<Element, Set<SourceController>>()

const NONE: ReadonlySet<string> = new Set()

/** A host that names the element it reads from. */
export interface SourceHost extends ReactiveControllerHost, HTMLElement {
  /**
   * The id of the table or grid to read.
   */
  for: string
  /**
   * Readings given as data, read where `for` names nothing.
   */
  data?: ChartData | undefined
  /**
   * The locale numbers in `data` are written in.
   */
  locale?: string
}

/**
 * Resolves the element a chart reads from, and follows it.
 *
 * Every chart that takes a `for` wants exactly this, and wants it to behave
 * identically, so it is a controller rather than a paragraph in each of them.
 *
 * A controller and not a pure function, by the test the rules set: it reacts to
 * the host's lifecycle. It has to start watching when the host connects, stop
 * when it leaves, and re-resolve when `for` changes.
 *
 * **What it refuses is as much the point as what it accepts.** A `<table>` or
 * anything built from grid roles, including this library's own `helix-table`,
 * whose roles live in `ElementInternals` and therefore write no attribute at
 * all. Anything else resolves to null, so a `for` pointed at a paragraph draws
 * nothing rather than something arbitrary.
 *
 * The element is watched for `childList` and `characterData` alike, because
 * renaming a series edits a text node in place rather than replacing a cell,
 * and nothing in a page has reason to know a chart is reading it.
 *
 * **The tree around it is watched as well, for the table that is not there
 * yet.** A framework page renders a chart first and its table once the data
 * loads, or re-keys the table and so replaces it under the same id. Watching
 * only the element resolved on connect found nothing in the first case and
 * kept a detached table in the second, and the chart drew neither until some
 * unrelated property changed. So the root the id resolves in is watched for
 * nodes arriving and leaving and for `id` and `role` changing, and each batch
 * asks the id again. That is one lookup by id per batch, and a chart redraws
 * only when the answer is a different element.
 */
export class SourceController implements ReactiveController {
  private host: SourceHost
  private observer: MutationObserver | undefined
  /** Watches the tree `for` resolves in, for the table arriving, leaving or being replaced. */
  private tree: MutationObserver | undefined
  /** The element the watcher is on, or null where `for` named nothing. */
  private watched: Element | null = null
  /** Whether a hydrating render was told there was nothing, and needs the render after. */
  private deferred = false

  /**
   * Which edit of the table the parses below belong to.
   *
   * Moved by the watcher and by `watch()`, which are the two things that can
   * change what a chart reads without the chart doing anything: an edit to the
   * table, and `for` naming another one.
   */
  private version = 0

  private heldRows: Parsed<Row[]> | undefined
  private heldSeries: Parsed<Series[]> | undefined

  constructor(host: SourceHost) {
    this.host = host
    host.addController(this)
  }

  /**
   * The element `for` names, or null where there is nothing to name it in.
   *
   * Null on the server as well, since resolving an id wants a document. Every
   * chart inherits that: the table is served whole and the drawing arrives on
   * hydration.
   *
   * **And null while hydrating what a server sent**, which drew nothing, because
   * the render that hydrates has to be the server's: a drawing that differs is
   * a template Lit throws on. The update after it, which this asks for, draws.
   */
  get element(): Element | null {
    if (this.hydrating) {
      this.deferred = this.host.for !== '' || this.host.data !== undefined
      return null
    }
    return this.resolve()
  }

  /** Whether the host is hydrating what a server sent. */
  private get hydrating(): boolean {
    return (this.host as unknown as { hydrating?: boolean }).hydrating === true
  }

  /**
   * The host's `data`, where it is read: on the client, after hydration, and
   * where `for` names no table.
   *
   * **Never on the server**, so a chart given data serves the frame, as one
   * reading a table does, and the drawing arrives on hydration. A server's
   * element shim has no `closest`, which is how one is told apart, Lit's
   * `isServer` being true in any test runner that resolves its `node` build.
   */
  private get data(): ChartData | undefined {
    const host = this.host as Partial<Element> & SourceHost
    if (host.data === undefined || typeof host.closest !== 'function' || this.hydrating) {
      return undefined
    }
    /* Any other shape, such as an array of rows, is read as no readings, and
       a development build says so. */
    if (!isChartData(host.data)) {
      auditData(host as unknown as HTMLElement)
      return undefined
    }
    return host.data
  }

  /**
   * Whether what the chart reads has been looked at: a table resolved or
   * looked for, or data read. False on the server and while hydrating, where
   * neither is, so a chart there says nothing about its readings.
   */
  get known(): boolean {
    const host = this.host as Partial<Element> & SourceHost
    if (host.for === '' && host.data === undefined) {
      return true
    }
    if (typeof host.closest !== 'function' || this.hydrating) {
      return false
    }
    return host.for === '' || searchableById(host)
  }

  /**
   * The element `for` names, whatever the host is rendering.
   *
   * Apart from `element` because the watcher needs the table while a render
   * cannot have it: attached on connect, which on a server's page is before
   * the render that hydrates, it resolved nothing there and never watched, so a
   * table a page filled afterwards drew no line.
   */
  private resolve(): Element | null {
    const host = this.host
    if (host.for === '') {
      return null
    }
    const found = elementById(host, host.for)
    if (!found) {
      return null
    }
    /* `tagName` rather than `instanceof HTMLTableElement`, which is not a guard
       on the server: the constructor is not defined there, so naming it throws
       before the comparison can answer false. It is also the check that
       survives an element from another document. */
    const role = found.getAttribute('role')
    return found.tagName === 'TABLE' ||
      role === 'table' ||
      role === 'grid' ||
      /^helix-(headless-)?table$/i.test(found.tagName)
      ? found
      : null
  }

  /**
   * The series it holds, or none.
   *
   * **Parsed once per edit, not once per read.** A chart's render asks for
   * these several times over, and the pointer asks for the row count on every
   * move, so parsing the whole table on each read was a table walk per
   * pointermove. The parse is held against the table it came from and the
   * edit it saw, and let go when either moves: `element` is compared by
   * identity, so a table replaced under the same id parses again, and the
   * watcher moves the version on every mutation it delivers.
   *
   * Which is a microtask after the edit, the observer being what it is. A
   * read in the same run as the edit answers the parse before it, and every
   * render that follows, which is what the watcher exists to ask for, answers
   * the one after. The same array comes back until then, so a consumer may
   * compare by identity.
   */
  get series(): Series[] {
    this.heldSeries = this.parsed(this.heldSeries, (table, data) =>
      table ? readSeries(table) : data ? seriesFromData(data, wordsLocale(this.host)) : [],
    )
    return this.heldSeries.value
  }

  /** Every row it holds, text and number alike, or none. Held the way `series` is. */
  get rows(): Row[] {
    this.heldRows = this.parsed(this.heldRows, (table, data) =>
      table ? readRows(table) : data ? rowsFromData(data, wordsLocale(this.host)) : [],
    )
    return this.heldRows.value
  }

  /**
   * A held parse where it still describes the table or the data, or a fresh
   * one. `data` is held by identity, so a new object is read again and an
   * object changed in place is not, as a Lit property is.
   */
  private parsed<T>(
    held: Parsed<T> | undefined,
    read: (table: Element | null, data: ChartData | undefined) => T,
  ): Parsed<T> {
    const element = this.element
    const data = element ? undefined : this.data
    if (held && held.element === element && held.data === data && held.version === this.version) {
      return held
    }
    return { data, element, value: read(element, data), version: this.version }
  }

  /**
   * The series hidden on the table, by lowercased name. Empty where there is
   * no table, which is every server render.
   */
  get hidden(): ReadonlySet<string> {
    const element = this.element
    return element ? (HIDDEN.get(element) ?? NONE) : NONE
  }

  /**
   * Hides these series on the table and shows every other, for every chart
   * and legend reading it, which then redraw. Answers the table it wrote to,
   * or null where `for` names none.
   *
   * Given `among`, only those names are shown or hidden, and a series hidden
   * outside them stays hidden. A legend passes its own entries, so a legend
   * of the rows and a legend of the columns on one table each keep what the
   * other hid.
   *
   * Names are matched without regard to case or surrounding space, as a
   * column's heading is everywhere else. Nothing happens where `for` names no
   * table, or the set is already this one, so two writers that agree stop
   * asking each other to redraw.
   */
  hide(names: Iterable<string>, among?: Iterable<string>): Element | null {
    const element = this.resolve()
    if (!element) {
      return null
    }
    const now = HIDDEN.get(element) ?? NONE
    const mine = among === undefined ? undefined : new Set([...among].map(seriesKey))
    const kept = mine === undefined ? [] : [...now].filter((one) => !mine.has(one))
    const next = new Set([...kept, ...[...names].map(seriesKey)].filter(Boolean))
    if (next.size === now.size && [...next].every((one) => now.has(one))) {
      return element
    }
    if (next.size === 0) {
      HIDDEN.delete(element)
    } else {
      HIDDEN.set(element, next)
    }
    for (const reader of READERS.get(element) ?? []) {
      reader.host.requestUpdate()
    }
    return element
  }

  /** Counts this controller among the readers of the table it watches, or of none. */
  private enlist(element: Element | null): void {
    if (this.watched) {
      READERS.get(this.watched)?.delete(this)
    }
    if (element) {
      let readers = READERS.get(element)
      if (!readers) {
        readers = new Set()
        READERS.set(element, readers)
      }
      readers.add(this)
    }
  }

  hostConnected(): void {
    this.watch()
    /* A `for` that names nothing once the page loaded, said in development.
       A chart given data and no `for` reads no table, and is not asked. */
    auditSource(this.host, () => this.resolve())
  }

  /* The drawing a hydrating render left out, asked for once it is done. */
  hostUpdated(): void {
    if (this.deferred) {
      this.deferred = false
      this.host.requestUpdate()
    }
  }

  hostDisconnected(): void {
    this.enlist(null)
    this.watched = null
    this.observer?.disconnect()
    this.observer = undefined
    this.tree?.disconnect()
    this.tree = undefined
  }

  /**
   * Points the watcher at whatever `for` names now.
   *
   * Called on connect and by the host when `for` changes. Safe to call when
   * there is no `MutationObserver`, which is the server.
   */
  watch(): void {
    this.observer?.disconnect()
    this.tree?.disconnect()
    this.version += 1
    const element = this.resolve()
    this.enlist(element)
    this.watched = element
    if (typeof MutationObserver === 'undefined') {
      return
    }
    this.watchTree()
    if (!element) {
      return
    }
    this.observer ??= new MutationObserver(() => {
      this.version += 1
      this.host.requestUpdate()
    })
    this.observer.observe(element, {
      characterData: true,
      childList: true,
      subtree: true,
    })
  }

  /**
   * Watches the root `for` resolves in, so a table that arrives, leaves or is
   * replaced under the same id is followed.
   *
   * Only while `for` names something and the host sits in a tree that can
   * resolve an id, which a detached host and a server render do not.
   */
  private watchTree(): void {
    const root = this.host.getRootNode() as Node & Partial<Document>
    if (this.host.for === '' || typeof root.getElementById !== 'function') {
      return
    }
    this.tree ??= new MutationObserver(() => {
      if (this.resolve() !== this.watched) {
        this.watch()
        this.host.requestUpdate()
      }
    })
    this.tree.observe(root, {
      attributeFilter: ['id', 'role'],
      childList: true,
      subtree: true,
    })
  }
}
