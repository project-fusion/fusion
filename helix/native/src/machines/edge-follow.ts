/*
 * A list that scrolls while a finger holding a row rests near one of its edges,
 * a frame at a time, as the web's reorder controller scrolls its box.
 */
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { Stop } from '@fusion.dev/helix-core/capabilities/types'

/** How long a frame lasts where every frame is on time, in milliseconds. */
const FRAME = 1000 / 60

/** Keeps calling what the finger last asked for, each frame, until it answers `false`. */
export interface EdgeFollow {
  /**
   * Runs `step` now, and again each frame while it answers `true`, with no move
   * of the finger needed. A later call replaces `step`. **It is told how many
   * frames have passed**, so a list scrolls at one speed however long a draw
   * holds up the next frame.
   */
  readonly follow: (step: (frames: number) => boolean) => void
  /** Stops following. */
  readonly stop: () => void
}

export const edgeFollow = (): EdgeFollow => {
  let waiting: Stop | undefined
  let step: ((frames: number) => boolean) | undefined
  let last = 0
  const stop = (): void => {
    waiting?.()
    waiting = undefined
    step = undefined
  }
  const run = (): void => {
    waiting = undefined
    const now = timers().now()
    const frames = Math.min(30, Math.max(1, (now - last) / FRAME))
    last = now
    if (step?.(frames) === true) {
      waiting = timers().frame(run)
    }
  }
  return {
    follow: (next) => {
      step = next
      if (waiting === undefined) {
        last = timers().now()
        run()
      }
    },
    stop,
  }
}
