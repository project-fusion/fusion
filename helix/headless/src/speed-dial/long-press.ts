import { DelayController } from '@fusion.dev/helix-core'
import type { ReactiveControllerHost } from 'lit'

/*
 * A press held still until it means "show me the rest", as React Aria's menu
 * trigger reads `trigger="longPress"`: a quick press is the trigger's own
 * action, and a held one opens what it holds.
 *
 * Beside the family's `index.ts`, because when a press has been held long
 * enough, how far it may drift, and which click it swallows are a rule about
 * pointers, and not the dial's template.
 */

/** How long a press is held before it counts, in milliseconds, as React Aria waits. */
export const LONG_PRESS_DELAY = 500

/**
 * How far a held pointer may drift and still be the same press, in pixels. A
 * finger is never still, and one that moves further is scrolling or dragging.
 */
export const LONG_PRESS_SLOP = 10

/** What a long press reads and calls. */
export interface LongPressOptions {
  /** Called once a press has been held for the delay without drifting. */
  onLongPress: () => void
}

/**
 * Watches one control's presses for a held one.
 *
 * The control's own handlers call `down`, `move` and `up`, so a press counts
 * only where it started on the control, and `cancel` drops it. The click a
 * held press ends in is the long press's, and `takeClick` says so once, so the
 * control's own action does not run as well.
 */
export class LongPress {
  private readonly wait: DelayController

  /** Where the press began, while one is held and still counts. */
  private from: { x: number; y: number } | undefined = undefined

  /** Whether the press that just ended was a long one, until its click is taken. */
  private held = false

  constructor(
    host: ReactiveControllerHost,
    private readonly options: LongPressOptions,
  ) {
    this.wait = new DelayController(host)
  }

  /** Starts the wait for a press of the primary button. */
  down(event: PointerEvent): void {
    this.held = false
    if (event.button !== 0) {
      return
    }
    this.from = { x: event.clientX, y: event.clientY }
    this.wait.start(LONG_PRESS_DELAY, () => {
      this.from = undefined
      this.held = true
      this.options.onLongPress()
    })
  }

  /** Drops the press once the pointer drifts past the slop. */
  move(event: PointerEvent): void {
    const from = this.from
    if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > LONG_PRESS_SLOP) {
      this.cancel()
    }
  }

  /**
   * Ends the press. A press released before the delay is an ordinary one.
   *
   * A held one keeps its claim on a click only until the task ends: the click
   * a release makes comes in the same task, and a release that makes none, off
   * the control or after a touch's own menu, must not leave the next Enter on
   * the control swallowed.
   */
  up(): void {
    this.from = undefined
    this.wait.cancel()
    if (this.held) {
      setTimeout(() => {
        this.held = false
      })
    }
  }

  /** Drops the press, which then neither opens anything nor swallows a click. */
  cancel(): void {
    this.from = undefined
    this.held = false
    this.wait.cancel()
  }

  /**
   * Whether a click belongs to the long press that just ended, and so is not
   * the control's. True once.
   */
  takeClick(): boolean {
    const held = this.held
    this.held = false
    return held
  }
}
