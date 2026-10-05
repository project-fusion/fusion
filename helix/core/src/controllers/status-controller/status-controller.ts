import {
  html,
  nothing,
  type ReactiveController,
  type ReactiveControllerHost,
  type TemplateResult,
} from 'lit'

/** How `say` speaks. */
export interface SayOptions {
  /**
   * Whether the region is emptied before the words land, so the same words
   * said twice are heard twice. Defaults to `true`.
   */
  clear?: boolean
}

/**
 * A live status region an element renders only once it has something to say,
 * and the words it says.
 *
 * **Not rendered until the first time**, so an element that never speaks
 * carries no live region: a button that never waits, a file field that never
 * refuses a file. `spoken` says whether it is rendered and `said` what it
 * holds, and `drawStatus` draws it.
 *
 * **The words land a frame after the region**, through `say`, because a region
 * that arrives with its words is read inconsistently, and emptied first, so
 * the same words twice are a change both times. `sayNow` puts them in at once,
 * for a region already rendered that is only changing what it says.
 *
 * `ArrivalController` is the other half of the same idea, for an element that
 * is itself the news.
 */
export class StatusController implements ReactiveController {
  /** Whether the region is rendered: from the first time anything is said. */
  spoken = false

  /** What the region says now. */
  said = ''

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this)
  }

  hostConnected(): void {}

  /** Says `words` a frame from now, rendering the region at once where it is not yet. */
  say(words: string, { clear = true }: SayOptions = {}): void {
    this.hold(true, clear ? '' : this.said)
    const fill = (): void => {
      this.hold(true, words)
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(fill)
    } else {
      fill()
    }
  }

  /** Says `words` now, in the same update that renders the region. */
  sayNow(words: string): void {
    this.hold(true, words)
  }

  /** Records what the region holds, and asks for an update only where that moved. */
  private hold(spoken: boolean, said: string): void {
    if (spoken === this.spoken && said === this.said) {
      return
    }
    this.spoken = spoken
    this.said = said
    this.host.requestUpdate()
  }
}

/**
 * The region a `StatusController` speaks in, or nothing before it has spoken:
 * `<span part="live" role="status">`, which the element documents as its
 * `live` part.
 */
export const drawStatus = (status: StatusController): TemplateResult | typeof nothing =>
  status.spoken ? html`<span part="live" role="status">${status.said}</span>` : nothing
