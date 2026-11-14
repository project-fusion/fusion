import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What a host hands the controller: the box to fit, and how each step folds. */
export interface OverflowOptions {
  /**
   * Writes step `step` onto the page, synchronously: `0` folds nothing, and
   * each step folds more than the one before it. The controller reads the box
   * after each write, so a step is on the page the moment this returns.
   *
   * The host's render draws the step the controller chose, and draws it the way
   * this writes it, so the render that follows a measure changes nothing.
   */
  apply: (step: number) => void

  /**
   * The box the row has to fit. The row fits while its content does not reach
   * past the box's inline end, so the box takes its width from its container
   * and never from what is in it.
   */
  box: () => HTMLElement | null | undefined

  /**
   * Whether the row fits the box as it stands. Unset, the box's content must
   * not reach past its inline end. A host whose box holds something placed
   * after a measure, such as a marker under the current item, says here which
   * elements to read, since that one still stands where the last step put it.
   */
  fits?: (box: HTMLElement) => boolean

  /** Elements besides the box whose size calls for a new measure, such as the items. */
  observe?: () => Element[]

  /**
   * Resolves once the controller may write: the first measure waits for it. A
   * host that folds elements a consumer wrote waits here for React to hydrate
   * them, since a write before then is a mismatch React reports and never
   * repairs.
   */
  ready?: () => Promise<void>

  /** How many steps there are past `0`. With none, nothing folds. */
  steps: () => number
}

/** Whether a box's content reaches past its inline end. */
const overflows = (box: HTMLElement): boolean => box.scrollWidth > box.clientWidth

/**
 * Whether every one of `elements` lies inside the box's content edges, read
 * as if the box were scrolled to its start. For a host whose box holds
 * something else that overflows it, such as a marker placed after a measure.
 */
export const insideBox = (box: HTMLElement, elements: Element[]): boolean => {
  const bounds = box.getBoundingClientRect()
  const style = getComputedStyle(box)
  const start = bounds.left + box.clientLeft + Number.parseFloat(style.paddingLeft)
  const end = bounds.left + box.clientLeft + box.clientWidth - Number.parseFloat(style.paddingRight)
  /* `scrollLeft` is negative toward the end of a right-to-left box, so adding
     it puts either direction back at its start. */
  const shift = box.scrollLeft
  return elements.every((element) => {
    const rect = element.getBoundingClientRect()
    return rect.left + shift >= start - 0.5 && rect.right + shift <= end + 0.5
  })
}

/**
 * Folds a row of controls that does not fit its box into a menu, step by step,
 * and keeps the least folded step that fits.
 *
 * **Measured, never listed.** The host says what each step folds, and the
 * controller finds the first step whose row fits. A list of controls to fold
 * written by the author is right at one width, in one language, for one
 * pointer: a block name in German, the wider gaps of a touch screen, or a
 * control a page adds at the end changes what fits. `Video` lists its overflow
 * because which controls a video offers is the author's choice. A toolbar's
 * tools and a navigation's links are chosen already, so what is left is the
 * width.
 *
 * **Each step is written and read at once.** A step that folds a tool changes
 * every gap and divider after it, so the controller writes a step through
 * `apply` and asks the box whether its content still overflows, rather than
 * adding widths that leave the gaps out. The search starts from the step
 * already on the page and moves one step at a time, so a measure that changes
 * nothing reads the layout twice.
 *
 * **A resize is answered in the next frame.** The box can shrink when it folds,
 * where its width follows its content, and a `ResizeObserver` callback that
 * changes the size of what it observes ends the frame with "ResizeObserver
 * loop completed with undelivered notifications". So the observer books a
 * frame, and the measure runs there. A host's own change is measured at once,
 * after its render and before the paint, by calling `request()` from
 * `willUpdate`.
 *
 * Client only. A server cannot measure, so it serves step `0`, every control
 * on the row, and the browser folds what does not fit once it has measured.
 */
export class OverflowController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: OverflowOptions

  /** Whether the controller may measure: connected, and past `ready`. */
  private armed = false

  /** Whether the host asked for a measure after its next render. */
  private asked = false

  /** Whether a measure has run since the controller armed, which the first render after it owes. */
  private measured = false

  /** The booked frame for a measure, or `0`. */
  private frame = 0

  /** The elements the observer watches now. */
  private readonly observed = new Set<Element>()

  private sized: ResizeObserver | undefined

  /** The step on the page, `0` until a measure folds anything. */
  private current = 0

  constructor(host: ReactiveControllerHost & HTMLElement, options: OverflowOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  /** The step the last measure chose: `0` while nothing is folded. */
  get step(): number {
    return this.current
  }

  /** Asks for a measure after the host's next render. Call it from `willUpdate`. */
  request(): void {
    this.asked = true
  }

  /**
   * Measures now and keeps the least folded step that fits, or the last step
   * where none does. Asks the host to render where the step changed.
   */
  measure(): void {
    const box = this.options.box()
    const steps = this.options.steps()
    if (!this.armed || !box?.isConnected) {
      return
    }
    const fits = (step: number): boolean => {
      this.options.apply(step)
      return this.options.fits ? this.options.fits(box) : !overflows(box)
    }
    let step = Math.min(this.current, steps)
    if (fits(step)) {
      while (step > 0 && fits(step - 1)) {
        step -= 1
      }
    } else {
      while (step < steps && !fits(step + 1)) {
        step += 1
      }
      step = Math.min(step + 1, steps)
    }
    /* The last write was the step below or above the one chosen, so the
       chosen one is written again. */
    this.options.apply(step)
    this.measured = true
    this.watch(box)
    if (step !== this.current) {
      this.current = step
      this.host.requestUpdate()
    }
  }

  /** Watches the box and the host's other elements, adding and dropping as they change. */
  private watch(box: HTMLElement): void {
    if (!this.sized) {
      return
    }
    const wanted = new Set<Element>([box, ...(this.options.observe?.() ?? [])])
    for (const element of this.observed) {
      if (!wanted.has(element)) {
        this.sized.unobserve(element)
        this.observed.delete(element)
      }
    }
    for (const element of wanted) {
      if (!this.observed.has(element)) {
        this.sized.observe(element)
        this.observed.add(element)
      }
    }
  }

  /** Books one measure for the next frame. */
  private readonly book = (): void => {
    if (this.frame !== 0) {
      return
    }
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.measure()
    })
  }

  hostConnected(): void {
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    this.sized = new ResizeObserver(this.book)
    void (this.options.ready?.() ?? Promise.resolve()).then(() => {
      if (!this.host.isConnected || !this.sized) {
        return
      }
      this.armed = true
      this.measure()
      /* A web font that arrives late widens every label without resizing the
         box, so the row is measured again once the page's fonts are in. */
      void document.fonts?.ready.then(() => this.book())
    })
  }

  hostDisconnected(): void {
    this.armed = false
    this.measured = false
    this.sized?.disconnect()
    this.sized = undefined
    this.observed.clear()
    if (this.frame !== 0) {
      cancelAnimationFrame(this.frame)
      this.frame = 0
    }
  }

  hostUpdated(): void {
    if (this.asked || !this.measured) {
      this.asked = false
      this.measure()
    }
  }
}
