import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** The two journeys an overlay makes. */
export type OpenPhase = 'entering' | 'exiting'

/** What an `OpenPhaseController` reads of its host and writes onto it. */
export interface OpenPhaseOptions {
  /**
   * Records each phase on the host, or takes it off: the host's own
   * `toggleState`, passed in because it is protected, and one callback per
   * phase so each state's name is written out where it is recorded.
   */
  mark: Record<OpenPhase, (on: boolean) => void>

  /** Whether the host is open, read after every update. */
  open: () => boolean

  /** The element whose animations are the entrance and the exit. */
  surface: () => Element | null | undefined
}

/**
 * Resolves once an element's animations have finished, or two frames on where
 * it has none.
 *
 * Two frames first, so an entrance that starts on the frame after the change,
 * as a `@starting-style` transition does once the element is shown, is
 * running by the time the element is asked. `subtree`, so a `::backdrop` and
 * anything inside the surface count too.
 */
export const animationsSettled = async (element: Element | null | undefined): Promise<void> => {
  const frame = (): Promise<void> =>
    new Promise((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve())
      } else {
        setTimeout(resolve, 16)
      }
    })
  await frame()
  await frame()
  if (!element || typeof element.getAnimations !== 'function') {
    return
  }
  await Promise.allSettled(element.getAnimations({ subtree: true }).map((one) => one.finished))
}

/**
 * Says on the host that an overlay is on its way in or out, until its
 * animations have finished, as `:state(entering)` and `:state(exiting)`.
 *
 * `:state(open)` turns at once, which is right for what the overlay is and too
 * early for a stylesheet that wants to draw the journey: an exit has to know it
 * is an exit while the panel is still on screen.
 *
 * **Never on the first update.** An overlay served open has made no journey,
 * and marking one would put a state on a page that nobody moved.
 *
 * A turn counter, because a close that arrives during an entrance starts a new
 * phase, and the entrance settling late must not clear the exit.
 */
export class OpenPhaseController implements ReactiveController {
  private readonly options: OpenPhaseOptions

  /** What `open` was after the last update, and `undefined` before the first. */
  private last: boolean | undefined

  /** Which phase is the latest. */
  private turn = 0

  constructor(host: ReactiveControllerHost, options: OpenPhaseOptions) {
    this.options = options
    host.addController(this)
  }

  hostUpdated(): void {
    const open = this.options.open()
    const last = this.last
    this.last = open
    if (last === undefined || last === open) {
      return
    }
    this.turn += 1
    const turn = this.turn
    this.options.mark.entering(open)
    this.options.mark.exiting(!open)
    void animationsSettled(this.options.surface()).then(() => {
      if (turn === this.turn) {
        this.options.mark.entering(false)
        this.options.mark.exiting(false)
      }
    })
  }
}
