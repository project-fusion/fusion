import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** How an element that announces itself reads what it has to say. */
export interface ArrivalOptions {
  /** The words, read off whatever the page put in the element. */
  text: () => string
  /** Whether the element is arriving now, rather than with the page. */
  arriving: () => boolean
}

/**
 * The words of an element that is announced when it appears, for a region that
 * is there before they are.
 *
 * **A live region is heard when what it holds changes, not when it arrives.**
 * An element the page inserts with its message already inside is a region
 * arriving with its words, which a screen reader reads inconsistently at best:
 * an empty state after a search, a banner raised mid-session. So the element
 * renders its region empty and this fills it a frame later, which is a change.
 *
 * **Left empty when the element came with the page**, served or parsed in the
 * first pass, because a message that was always there is content rather than
 * news, and a region that spoke on every page load would interrupt a reader
 * before they had read anything. Its words are the baseline instead, and the
 * region speaks only when they change. Filling it at once also drew the words a
 * second time on the headless tier, which has no sheet to clip the region, and
 * a served page changed its picture on hydrating.
 *
 * The component renders `said` into its region and calls `say` when what it
 * holds changes, from a `slotchange`.
 */
export class ArrivalController implements ReactiveController {
  /** What the region says now. */
  said = ''

  /** The words last accounted for, said or not. */
  private heard = ''

  private frame = 0

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly options: ArrivalOptions,
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    cancelAnimationFrame(this.frame)
    if (!this.options.arriving()) {
      this.heard = this.options.text()
      return
    }
    this.heard = ''
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.say()
    })
  }

  hostDisconnected(): void {
    cancelAnimationFrame(this.frame)
    this.frame = 0
  }

  /** Reads the words again, and says them if they moved. */
  say(): void {
    const next = this.options.text()
    if (next === this.heard) {
      return
    }
    this.heard = next
    this.said = next
    this.host.requestUpdate()
  }
}
