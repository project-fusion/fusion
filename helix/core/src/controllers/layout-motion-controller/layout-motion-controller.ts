import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { reducedMotion } from '../../utils/page-motion/page-motion.js'

/** What a `LayoutMotionController` reads of its host. */
export interface LayoutMotionOptions {
  /** Every item that can move, in the order they are drawn. Read at every change. */
  items: () => readonly HTMLElement[]

  /**
   * How long a move takes and its curve, as the host's family hooks hold them,
   * such as `--list-move-duration` and `--list-move-easing`. Read at every
   * change. A duration that is empty, or under a millisecond, moves nothing.
   */
  timing: () => { duration: string; easing: string }

  /**
   * What says the items changed. `children`, the default, hears the page add,
   * remove, reorder or hide the host's children. `updates` looks once each
   * update of the host has finished, for a host that draws or arranges its
   * items itself: a table that sorts by assigning its rows to a slot in a new
   * order, or one that renders its rows.
   */
  watch?: 'children' | 'updates'

  /**
   * The box the items scroll in, where it is not the page: a table that
   * scrolls sideways in its own box. Its scroll is added back to each place,
   * so a reader who scrolled between two changes does not see every row slide
   * by the distance they scrolled.
   */
  scroller?: () => Element | null | undefined

  /**
   * The boxes an item is drawn in, where they are not the item and what it
   * draws: a table's column is its heading and the cells under it, which
   * live in different rows. The first is the one its place is measured by,
   * and each is resolved as an item is, so one that is `display: contents`
   * gives the boxes it draws.
   */
  boxes?: (item: HTMLElement) => readonly HTMLElement[]

  /**
   * Where a copy of an item that leaves is laid while it fades, for a list
   * whose items go one at a time, such as a field's tags or a feed's rows:
   * a positioned box in the host's shadow root, or the shadow root itself
   * for a host that is positioned. Where it is not given, an item that
   * leaves is simply gone, and the items after it slide into its room.
   */
  leaving?: () => HTMLElement | ShadowRoot | null | undefined

  /**
   * Whether the first items into a list that was empty fade in. Off, they
   * are a list arriving whole, which stands still, as a table's first page
   * does. On for a field whose first tag or file the reader just chose.
   */
  arriveIntoEmpty?: boolean
}

/** How big an item's box is, in the host's layout pixels, for the copy that shows it leaving. */
interface Size {
  width: number
  height: number
}

/** Where an item's box sits inside its host, in the host's layout pixels. */
interface Place {
  x: number
  y: number
}

/** A move in flight: the offset it started from, so the offset it shows now can be worked out. */
interface Flight {
  /** One for each box the item is drawn in, all on one curve. */
  animations: Animation[]
  from: Place
}

/** How far a box arrives from, in pixels, before it settles in its place. */
const ARRIVAL = 6

/** Reads a duration as milliseconds. Anything that does not read as one is 0. */
const milliseconds = (value: string): number => {
  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount)) {
    return 0
  }
  return value.trim().endsWith('ms') ? amount : amount * 1000
}

/**
 * The host's on-screen size over its layout size, for each axis.
 *
 * A difference of a pixel or less is `offsetWidth`'s rounding and counts as no
 * scale, as `IndicatorController` counts it.
 */
const scaleOf = (host: HTMLElement, box: DOMRect): Place => {
  const along = (drawn: number, laid: number): number =>
    laid > 0 && Math.abs(drawn - laid) > 1 ? drawn / laid : 1
  return { x: along(box.width, host.offsetWidth), y: along(box.height, host.offsetHeight) }
}

/**
 * The boxes an element is drawn in: the element itself, or where it is
 * `display: contents`, as a table's row is, the boxes of what it draws, through
 * its shadow root and its slots. A row of cells moves as its cells.
 */
export const boxesOf = (element: Element): HTMLElement[] => {
  if (getComputedStyle(element).display !== 'contents') {
    return element instanceof HTMLElement ? [element] : []
  }
  const inside =
    element instanceof HTMLSlotElement
      ? element.assignedElements({ flatten: true })
      : [...(element.shadowRoot ?? element).children]
  return inside.flatMap(boxesOf)
}

/**
 * Moves each item from where it was drawn to where it is drawn after a change,
 * so a row that is added, sorted, hidden or closed up slides into its place
 * instead of jumping there.
 *
 * **The change is heard, not announced.** The items of a list or a group are
 * the page's children, which the page or its framework adds, removes and
 * reorders on its own, so no update of the host comes before the change. A
 * `MutationObserver` hears children arrive, leave and change `hidden`, and
 * each item's place before the change is the one recorded after the last
 * change, after a resize of the host, or when the host connected.
 *
 * **A move interrupted by another starts from where the item is drawn.** The
 * offset a move in flight is showing is worked out from its eased progress and
 * added to the place it was heading for, so a second sort mid-slide carries on
 * from the screen with no jump back.
 *
 * **The stylesheet decides whether anything moves.** The timing is the host
 * family's own hooks, which `timing` reads by name so each family publishes
 * the hooks it reads. The styled tier sets them from the duration and easing
 * tokens, and the page can set them on the element. The headless tier sets
 * neither, so it never moves until the page does. **Reduced motion stops
 * every move**, whatever the properties say, because a page that writes a
 * literal duration has not answered the reader's setting.
 *
 * **Places are layout pixels inside the host.** A box measured on screen is
 * divided by the host's scale, because a move is written as a translation in
 * the item's own pixels, and a list inside a scaled preview would otherwise
 * travel the scale's share too far. Inside the host, so a page that scrolls
 * while a row moves does not move its start.
 *
 * **An item that arrives fades in, unless every item is new.** A framework
 * that renders the whole list again with new elements has replaced it rather
 * than added to it, and the whole list arriving at once would be a flash.
 * `arriveIntoEmpty` makes a list that was empty an exception, for a field
 * whose first file or tag is the reader's own doing.
 * The items there when the host connected arrive with the page, and do not
 * fade.
 *
 * **An item with no box of its own moves as the boxes it draws.** A table's
 * row is `display: contents`, so its cells take the move, one animation each
 * on one curve, and a row of cells slides as one.
 *
 * **An item that leaves can fade where it was**, where `leaving` names a box
 * for its copy: a field's tags, a feed's rows. Otherwise it is gone at once
 * and the items after it slide into its room.
 *
 * Only `transform` and `opacity` are animated, so a move never sets off
 * layout, and each animation is composited onto the item's own transform.
 */
export class LayoutMotionController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: LayoutMotionOptions

  /** Where each item was drawn after the last change. Empty until the first record. */
  private places = new Map<HTMLElement, Place>()

  /** How big each item was drawn after the last change, for `leaving`. */
  private sizes = new Map<HTMLElement, Size>()

  /** Whether the host has been measured once, so a change after that is a change. */
  private recorded = false

  /** The items in the order they were drawn after the last change, which `updates` compares against. */
  private order: readonly HTMLElement[] = []

  /** The moves in flight, by item. */
  private readonly flights = new WeakMap<HTMLElement, Flight>()

  private mutations: MutationObserver | undefined

  private resizes: ResizeObserver | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: LayoutMotionOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  hostConnected(): void {
    if (this.options.watch !== 'updates' && typeof MutationObserver !== 'undefined') {
      this.mutations ??= new MutationObserver((records) => this.heard(records))
      this.mutations.observe(this.host, {
        attributeFilter: ['hidden'],
        childList: true,
        subtree: true,
      })
    }
    if (typeof ResizeObserver !== 'undefined') {
      /* Fires once on observing, which is the first record. */
      this.resizes ??= new ResizeObserver(() => this.record())
      this.resizes.observe(this.host)
    }
  }

  hostDisconnected(): void {
    this.mutations?.disconnect()
    this.resizes?.disconnect()
    this.places = new Map()
    this.order = []
    this.recorded = false
  }

  /**
   * Looks for a change once the host's update has finished, under `updates`.
   *
   * **A microtask later**, because a host's `updated` runs after its
   * controllers hear `hostUpdated`, and a table assigns its rows in `updated`.
   * Measured before that, every row was still in the order of the last sort.
   */
  hostUpdated(): void {
    if (this.options.watch !== 'updates') {
      return
    }
    queueMicrotask(() => {
      const items = this.options.items()
      const same =
        items.length === this.order.length && items.every((item, at) => item === this.order[at])
      if (!same) {
        this.move()
      }
    })
  }

  /**
   * Whether a set of records changed the items: one arriving or leaving the
   * host or another item, as a row does a tree's branch, or turning `hidden`.
   * A change inside an item, such as a streaming turn's text, is none.
   */
  private heard(records: readonly MutationRecord[]): void {
    const items = new Set<Node>(this.options.items())
    const changed = records.some((one) =>
      one.type === 'childList'
        ? one.target === this.host ||
          (items.has(one.target) &&
            ([...one.addedNodes].some((node) => items.has(node)) ||
              [...one.removedNodes].some((node) => this.places.has(node as HTMLElement))))
        : items.has(one.target) || one.target.parentNode === this.host,
    )
    if (!changed) {
      return
    }
    /* **An element arriving that draws itself has not drawn yet**: its first
       render is a microtask behind this callback, so measured now it has no
       height, and the items after it measured exactly where they were and did
       not move. A Timeline item draws its whole height in its shadow root.
       Measured once it has rendered, still before the frame is painted. */
    const pending = records
      .flatMap((one) => [...one.addedNodes])
      .filter(
        (node): node is HTMLElement & { updateComplete: Promise<unknown> } =>
          node instanceof HTMLElement &&
          'updateComplete' in node &&
          (node as { isUpdatePending?: boolean }).isUpdatePending === true,
      )
    if (pending.length > 0) {
      void Promise.all(pending.map((node) => node.updateComplete)).then(() => this.move())
      return
    }
    this.move()
  }

  /** Records where every item is drawn now, with no move started. */
  private record(): void {
    const { now, sizes } = this.measure()
    this.places = now
    this.sizes = sizes
    this.order = this.options.items()
    this.recorded = true
  }

  /**
   * Where each drawn item is laid out now, the offset the moves in flight are
   * showing on top of that, and the nearest item each one sits inside. An item
   * with no box, `hidden` or in a closed subtree, has no place.
   *
   * **The offset an item shows is its own move and every move around it**,
   * because an item inside another, as a tree's branch holds its rows, is
   * drawn wherever its parent's translation puts it.
   */
  private measure(): {
    now: Map<HTMLElement, Place>
    showing: Map<HTMLElement, Place>
    sizes: Map<HTMLElement, Size>
    within: Map<HTMLElement, HTMLElement>
  } {
    const items = this.options.items()
    const all = new Set(items)
    const within = new Map<HTMLElement, HTMLElement>()
    for (const item of items) {
      for (let up = item.parentElement; up && up !== this.host; up = up.parentElement) {
        if (all.has(up)) {
          within.set(item, up)
          break
        }
      }
    }
    const showing = new Map<HTMLElement, Place>()
    const shown = (item: HTMLElement): Place => {
      const known = showing.get(item)
      if (known) {
        return known
      }
      const own = this.offset(item)
      const outer = within.get(item)
      const around = outer ? shown(outer) : { x: 0, y: 0 }
      const total = { x: own.x + around.x, y: own.y + around.y }
      showing.set(item, total)
      return total
    }
    const now = new Map<HTMLElement, Place>()
    const sizes = new Map<HTMLElement, Size>()
    const frame = this.host.getBoundingClientRect()
    const scale = scaleOf(this.host, frame)
    const scroller = this.options.scroller?.()
    const scrolled = { x: scroller?.scrollLeft ?? 0, y: scroller?.scrollTop ?? 0 }
    for (const item of items) {
      const first = this.boxes(item)[0]
      if (!first || first.getClientRects().length === 0) {
        continue
      }
      const box = first.getBoundingClientRect()
      const offset = shown(item)
      now.set(item, {
        x: (box.left - frame.left) / scale.x - offset.x + scrolled.x,
        y: (box.top - frame.top) / scale.y - offset.y + scrolled.y,
      })
      sizes.set(item, { height: box.height / scale.y, width: box.width / scale.x })
    }
    return { now, showing, sizes, within }
  }

  /**
   * The boxes an item is drawn in. What `boxes` names is resolved as an item
   * is, so a heading that draws its box in its shadow root gives that box.
   */
  private boxes(item: HTMLElement): readonly HTMLElement[] {
    return this.options.boxes ? this.options.boxes(item).flatMap(boxesOf) : boxesOf(item)
  }

  /** The translation an item's own move in flight is drawing now, from its eased progress. */
  private offset(item: HTMLElement): Place {
    const flight = this.flights.get(item)
    const first = flight?.animations[0]
    const progress = first?.effect?.getComputedTiming().progress
    if (!flight || typeof progress !== 'number' || first?.playState !== 'running') {
      return { x: 0, y: 0 }
    }
    return { x: flight.from.x * (1 - progress), y: flight.from.y * (1 - progress) }
  }

  /**
   * Slides every item that moved from where it was drawn to where it is now.
   *
   * **An item inside another moves only by the difference.** Its parent's
   * translation already carries it, so its own starts from where it was drawn
   * less where its parent's starts, and the two run on one curve and add up to
   * its whole journey at every frame. An item that arrives inside another that
   * arrives fades in with it, and does not fade a second time.
   */
  private move(): void {
    const before = this.places
    const sized = this.sizes
    const recorded = this.recorded
    const { now, showing, sizes, within } = this.measure()
    this.places = now
    this.sizes = sizes
    this.order = this.options.items()
    this.recorded = true
    const timing = this.options.timing()
    const duration = milliseconds(timing.duration)
    if (!recorded || duration < 1 || reducedMotion()) {
      return
    }
    const easing = timing.easing.trim() || 'ease'
    /* An empty list taking its first items has replaced nothing, where the
       host says so: a field's first files arrive. A table drawing the rows
       its server sent has replaced them, and they stand still. */
    const replaced =
      !(this.options.arriveIntoEmpty && before.size === 0) &&
      [...now.keys()].every((item) => !before.has(item))
    if (this.options.leaving && !replaced) {
      this.leave(before, sized, now, duration)
    }
    const journeys = new Map<HTMLElement, Place>()
    for (const [item, place] of now) {
      const was = before.get(item)
      if (was) {
        const drawn = showing.get(item) ?? { x: 0, y: 0 }
        journeys.set(item, { x: was.x + drawn.x - place.x, y: was.y + drawn.y - place.y })
      }
    }
    for (const item of now.keys()) {
      const outer = within.get(item)
      const journey = journeys.get(item)
      if (!journey) {
        const carried = outer !== undefined && now.has(outer) && !before.has(outer)
        if (!replaced && !carried) {
          this.arrive(item, duration, easing)
        }
        continue
      }
      const around = (outer && journeys.get(outer)) ?? { x: 0, y: 0 }
      const from = { x: journey.x - around.x, y: journey.y - around.y }
      this.land(item)
      if (Math.abs(from.x) < 0.5 && Math.abs(from.y) < 0.5) {
        continue
      }
      const animations = this.boxes(item).map((box) =>
        box.animate(
          [{ transform: `translate(${from.x}px, ${from.y}px)` }, { transform: 'translate(0, 0)' }],
          { composite: 'add', duration, easing },
        ),
      )
      this.flights.set(item, { animations, from })
    }
  }

  /**
   * Fades in an item that was not drawn before the change, settling from a
   * little above its place.
   *
   * Two animations, because the fade replaces the item's opacity and the
   * settle adds to its transform: added, an opacity from 0 would start from
   * the item's own and never fade.
   */
  private arrive(item: HTMLElement, duration: number, easing: string): void {
    this.land(item)
    for (const box of this.boxes(item)) {
      box.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing })
      box.animate(
        [{ transform: `translate(0, ${-ARRIVAL}px)` }, { transform: 'translate(0, 0)' }],
        {
          composite: 'add',
          duration,
          easing,
        },
      )
    }
  }

  /**
   * **Copies of the items that left, fading where they were drawn**, so an
   * item that goes does not vanish in a frame. Each is a clone laid in the
   * `leaving` box at the item's last place and size, inert and hidden from
   * assistive technology, shrinking a little as it fades over the first half
   * of the move, on a curve that leaves, and gone after.
   *
   * Only the outermost of what left: a row's own items go with its copy.
   * Not a list replaced whole, which is new rather than changed.
   */
  private leave(
    before: Map<HTMLElement, Place>,
    sizes: Map<HTMLElement, Size>,
    now: Map<HTMLElement, Place>,
    duration: number,
  ): void {
    const holder = this.options.leaving?.()
    if (!holder) {
      return
    }
    const gone = [...before.keys()].filter((item) => !now.has(item))
    const outermost = gone.filter((item) => {
      for (let up = item.parentElement; up && up !== this.host; up = up.parentElement) {
        if (gone.includes(up)) {
          return false
        }
      }
      return true
    })
    if (outermost.length === 0) {
      return
    }
    /* The holder's own corner in the host's layout pixels, which the copies
       are placed from. */
    const frame = this.host.getBoundingClientRect()
    const scale = scaleOf(this.host, frame)
    const box = holder instanceof ShadowRoot ? this.host : holder
    const corner =
      box === this.host
        ? { x: this.host.clientLeft, y: this.host.clientTop }
        : (() => {
            const rect = box.getBoundingClientRect()
            return {
              x: (rect.left - frame.left) / scale.x + box.clientLeft - box.scrollLeft,
              y: (rect.top - frame.top) / scale.y + box.clientTop - box.scrollTop,
            }
          })()
    for (const item of outermost) {
      const place = before.get(item)
      const size = sizes.get(item)
      if (!place || !size || (size.width === 0 && size.height === 0)) {
        continue
      }
      const copy = item.cloneNode(true) as HTMLElement
      copy.removeAttribute('id')
      copy.removeAttribute('slot')
      copy.removeAttribute('hidden')
      copy.setAttribute('aria-hidden', 'true')
      copy.setAttribute('data-leaving', '')
      copy.inert = true
      Object.assign(copy.style, {
        blockSize: `${size.height}px`,
        boxSizing: 'border-box',
        inlineSize: `${size.width}px`,
        left: `${place.x - corner.x}px`,
        margin: '0',
        pointerEvents: 'none',
        position: 'absolute',
        top: `${place.y - corner.y}px`,
      })
      holder.appendChild(copy)
      if (typeof copy.animate !== 'function') {
        copy.remove()
        continue
      }
      const fade = copy.animate(
        [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(0.9)' },
        ],
        { duration: duration / 2, easing: 'cubic-bezier(0.3, 0, 1, 1)', fill: 'forwards' },
      )
      const done = (): void => copy.remove()
      void fade.finished.then(done, done)
    }
  }

  /** Ends an item's move in flight where it is, for a new one to start from. */
  private land(item: HTMLElement): void {
    for (const animation of this.flights.get(item)?.animations ?? []) {
      animation.cancel()
    }
    this.flights.delete(item)
  }
}
