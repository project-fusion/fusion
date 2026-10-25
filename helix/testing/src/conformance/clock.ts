import type { Intent, Scenario } from './format.js'

/**
 * The fake clock a scenario's `wait`, `hide`, and `show` move, as the timers
 * capability's fake in `@fusion.dev/helix-core/capabilities/timers/fake` is.
 *
 * **Each half sets the fake as the timers capability before the setup is
 * drawn**, only for a scenario that moves it, and hands it to its harness. An
 * element reads its time through the timers capability for a `wait` to reach
 * it.
 */
export interface Clock {
  /** Moves the clock forward, running each timeout that comes due. */
  readonly advance: (ms: number) => void
  /** Brings the page to the front or sends it away. */
  readonly setVisible: (visible: boolean) => void
}

/** Whether a scenario moves the fake clock. */
export const usesClock = (scenario: Scenario): boolean =>
  scenario.intents.some(
    (intent) => intent.kind === 'wait' || intent.kind === 'hide' || intent.kind === 'show',
  )

/**
 * Performs a clock's intent on `clock`, and says why it cannot where no
 * clock was given.
 */
export const moveClock = (
  clock: Clock | undefined,
  intent: Extract<Intent, { kind: 'hide' | 'show' | 'wait' }>,
): string | undefined => {
  if (clock === undefined) {
    return 'The harness was given no fake clock.'
  }
  if (intent.kind === 'wait') {
    clock.advance(intent.ms)
  } else {
    clock.setVisible(intent.kind === 'show')
  }
  return undefined
}
