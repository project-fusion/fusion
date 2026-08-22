import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What the controller needs of a set and the box it is shown in. */
export interface VirtualizeOptions {
  /** The scrolling box, or null before it renders. */
  container: () => HTMLElement | null | undefined
  /** How many items there are in total, shown or not. */
  count: () => number
  /** How tall one item is along the scroll axis, in pixels. */
  estimate: () => number
  /**
   * Rows kept either side of what fits, so a scroll reveals something drawn
   * rather than something blank. Four by default, which is roughly a frame of
   * fast scrolling at a 32 pixel row.
   */
  overscan?: number
}

/** Which slice is rendered, and how much empty space stands in for the rest. */
export interface Window {
  /** How much room the items before `first` would have taken, in pixels. */
  before: number
  /** How much room the items after `last` would take, in pixels. */
  after: number
  /** Index of the first item rendered. */
  first: number
  /** Index one past the last item rendered. */
  last: number
}

/**
 * Works out which slice of a long set is worth rendering.
 *
 * **A controller and not an element, which is the whole reason it is here.**
 * Table, Listbox, Combobox and Tree each need windowing *inside* themselves,
 * and an element would make each of them nest one in its own shadow root: a
 * listbox whose options are inside a `<helix-virtual-list>` is a listbox whose
 * options are no longer its children, so its own keyboard, its own selection
 * and its own ARIA all have a stranger in the middle of them.
 *
 * **A windowed set still reports its true length, and each row its true
 * position.** This is the part virtualization usually gets wrong and the reason
 * the arithmetic lives somewhere shared. A reader on row 4,000 of 10,000 must
 * hear "4,000 of 10,000", so `aria-setsize` is the count and `aria-posinset` is
 * the real index, never the position within the rendered slice. The window is a
 * rendering decision and the set is a fact, and a component that lets the first
 * overwrite the second has told a screen reader the list is twelve long.
 *
 * **The spacers are what make the scrollbar honest.** Rendering twelve rows in
 * a box that should scroll for ten thousand gives a thumb the size of the
 * track, so the room the absent rows would have taken is left as padding before
 * and after. A reader dragging that thumb is dragging against the real length.
 *
 * **What it does not do, and the reason is narrower than it first looks.** True
 * virtualization means never creating the rows that are not on screen, and that
 * needs the set as *data*. Two channels are shut: a consumer's items arrive as
 * light-DOM children, which exist by the time this could decide not to create
 * them, and an `items` property cannot survive React hydration, which skips
 * every property it would have to apply imperatively (see `bindReactHandler`,
 * and the note in the rules that objects and functions have that bug and are
 * not fixed).
 *
 * **A third is open, and this said otherwise until 21 Aug 2026.** Data as *text*
 * in the markup, a `<script type="application/json">` child or an attribute, is
 * neither a property nor a node per row: React's hydration bug cannot touch text
 * it renders as a child, a server emits it, and the node count is one. The
 * charts already read data out of the document this way, `for="<id>"` at a real
 * `<table>`, so the pattern is in the library rather than being invented for
 * this.
 *
 * So the thing actually blocked is the *row template*. Turning an item into
 * markup wants either a render function, which is a function property and dies
 * on the same bug, or a `<template>` with named holes, which survives because it
 * is markup and which no component here asks anyone to write. That is a decision
 * about what this library is willing to look like, not a platform limit, and it
 * is open at #71.
 *
 * So what this buys is the expensive half rather than all of it: the rows
 * outside the window are not laid out and not painted, which is where the time
 * goes in a long list, and the node count stays. That is worth having and it is
 * not worth calling something it is not. An element that windows children it
 * was handed is not a virtual list, whatever it is named.
 *
 * **One estimate, not per-row measurement.** Measuring every row to place it is
 * how a virtual list ends up reading the layout it is trying to avoid, and it
 * is what makes them jump: a row taller than its estimate shifts everything
 * after it at the moment it renders. A fixed estimate is a straight line
 * between scroll offset and index, which never disagrees with itself. Rows of
 * genuinely different heights are a different component and a harder one.
 */
export class VirtualizeController implements ReactiveController {
  private readonly host: ReactiveControllerHost
  private readonly options: VirtualizeOptions
  private observer: ResizeObserver | undefined
  private watching = false

  /** The slice to render, recomputed on scroll and on resize. */
  window: Window = { after: 0, before: 0, first: 0, last: 0 }

  constructor(host: ReactiveControllerHost, options: VirtualizeOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  hostConnected(): void {
    /* Nothing is observed here, and that is deliberate. `hostConnected` runs
       before the first render, so the container query returns null and an
       observer attached to nothing observes nothing for the life of the
       element. `CollapseController` shipped exactly that bug and it was
       invisible: the first measurement was right, so the only symptom was a
       window that never moved again. */
    this.observer = new ResizeObserver(() => {
      this.measure()
    })
  }

  hostDisconnected(): void {
    this.observer?.disconnect()
    this.observer = undefined
    this.watching = false
    this.options.container()?.removeEventListener('scroll', this.handleScroll)
  }

  /** Attaches to the box the first time there is one to attach to. */
  private watch(): void {
    if (this.watching) {
      return
    }
    const box = this.options.container()
    if (!box || !this.observer) {
      return
    }
    this.observer.observe(box)
    box.addEventListener('scroll', this.handleScroll, { passive: true })
    this.watching = true
  }

  /* `passive`, because this never calls `preventDefault` and saying so lets the
     browser scroll without waiting to find out. */
  private readonly handleScroll = (): void => {
    this.measure()
  }

  /**
   * Reads the scroll offset and settles the window.
   *
   * Asks for an update only when the slice actually moved. A scroll fires many
   * events per frame and most of them land inside the row already at the top,
   * so requesting one per event would re-render the list for every pixel.
   */
  measure(): void {
    this.watch()
    const box = this.options.container()
    const total = Math.max(0, this.options.count())
    const size = Math.max(1, this.options.estimate())
    if (!box) {
      return
    }
    const overscan = this.options.overscan ?? 4
    const first = Math.max(0, Math.floor(box.scrollTop / size) - overscan)
    const fits = Math.ceil(box.clientHeight / size) + overscan * 2
    const last = Math.min(total, first + fits)
    const next: Window = {
      after: Math.max(0, (total - last) * size),
      before: first * size,
      first,
      last,
    }
    const same =
      next.first === this.window.first &&
      next.last === this.window.last &&
      next.before === this.window.before &&
      next.after === this.window.after
    if (same) {
      return
    }
    this.window = next
    this.host.requestUpdate()
  }
}
