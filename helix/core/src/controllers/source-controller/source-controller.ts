import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { readSeries, type Series } from '../../utils/read-series/read-series.js'

/** A host that names the element it reads from. */
export interface SourceHost extends ReactiveControllerHost, HTMLElement {
  /**
   * The id of the table or grid to read.
   */
  for: string
}

/**
 * Resolves the element a chart reads from, and follows it.
 *
 * **Three charts had written this out separately before it was one thing**, and
 * the drift had already started: two of them called the lookup `#table` and one
 * called it `#source`, for the same method with the same body. Every chart that
 * takes a `for` wants exactly this, and wants it to behave identically, so it is
 * a controller rather than a paragraph in each of them.
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
 */
export class SourceController implements ReactiveController {
  #host: SourceHost
  #observer: MutationObserver | undefined

  constructor(host: SourceHost) {
    this.#host = host
    host.addController(this)
  }

  /**
   * The element `for` names, or null where there is nothing to name it in.
   *
   * Null on the server as well, since resolving an id wants a document. Every
   * chart inherits that: the table is served whole and the drawing arrives on
   * hydration.
   */
  get element(): Element | null {
    const host = this.#host
    if (host.for === '') {
      return null
    }
    const root = host.getRootNode() as Document | ShadowRoot
    const found = root.getElementById?.(host.for)
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

  /** The series it holds, or none. */
  get series(): Series[] {
    const element = this.element
    return element ? readSeries(element) : []
  }

  hostConnected(): void {
    this.watch()
  }

  hostDisconnected(): void {
    this.#observer?.disconnect()
    this.#observer = undefined
  }

  /**
   * Points the watcher at whatever `for` names now.
   *
   * Called on connect and by the host when `for` changes. Safe to call when
   * there is no `MutationObserver`, which is the server.
   */
  watch(): void {
    this.#observer?.disconnect()
    const element = this.element
    if (!element || typeof MutationObserver === 'undefined') {
      return
    }
    this.#observer ??= new MutationObserver(() => {
      this.#host.requestUpdate()
    })
    this.#observer.observe(element, {
      characterData: true,
      childList: true,
      subtree: true,
    })
  }
}
