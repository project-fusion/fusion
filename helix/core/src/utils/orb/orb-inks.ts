/**
 * An orb's two colors crossing from the ones on the screen to new ones, for
 * the web's canvas and a phone's alike.
 *
 * **The script crosses the colors, and the stylesheet only says they moved.**
 * A color the page sets per state changes on the frame the state does, and
 * the stylesheet's own transition finished it in a fast beat while the shape
 * took most of a second, so the new color arrived on the old shape.
 */

import { smoother } from './shapes.js'

/** A color as red, green and blue from 0 to 255, and alpha from 0 to 1. */
type Ink = readonly [number, number, number, number]

/** Whether two read colors are the same, channel for channel. */
const sameColor = (a: Ink, b: Ink): boolean =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]

/**
 * A color `t` of the way from `a` to `b`, each weighted by its alpha, as a dot
 * is mixed toward the ground, so a clear end fades the other out and does not
 * pass through black.
 */
export const mixInk = (a: Ink, b: Ink, t: number): Ink => {
  const alpha = a[3] + (b[3] - a[3]) * t
  if (alpha <= 0) {
    return [b[0], b[1], b[2], 0]
  }
  const channel = (at: 0 | 1 | 2): number =>
    (a[at] * a[3] + (b[at] * b[3] - a[at] * a[3]) * t) / alpha
  return [channel(0), channel(1), channel(2), alpha]
}

/** The first duration a computed `transition-duration` lists, in milliseconds. */
export const firstMilliseconds = (duration: string): number => {
  const first = duration.split(',')[0]?.trim() ?? ''
  const value = Number.parseFloat(first)
  if (!Number.isFinite(value)) {
    return 0
  }
  return first.endsWith('ms') ? value : value * 1000
}

/** What a crossing is asked for at a frame. */
export interface InkAsk {
  /** How long a change of colors on its own takes, in milliseconds. */
  readonly alone: number
  /** How long is left of the change of state under way, in milliseconds, or 0. */
  readonly left: number
  /** The frame's time, in milliseconds. */
  readonly now: number
  /** Whether no frame follows to finish a crossing, so the new colors land at once. */
  readonly snap: boolean
}

/**
 * The ink and ground an orb draws each frame, crossing to the colors its
 * stylesheet now resolves.
 *
 * **A change during a change of state lands with the shape**, over what is
 * left of it. Any other change, such as a theme switch, takes `alone`, the
 * stylesheet's transition duration, which the token layer shortens for a
 * reader who asked for no motion. A frame drawn once, still or with the loop
 * stopped, takes the new colors at once.
 */
export class OrbInks {
  private from: readonly [Ink, Ink] | undefined
  private to: readonly [Ink, Ink] | undefined
  private at = 0
  private span = 0

  /** The ink and ground to draw, given the ones the stylesheet resolves now. */
  cross(ink: Ink, ground: Ink, ask: InkAsk): [Ink, Ink] {
    const to = this.to
    if (ask.snap || !to) {
      this.from = this.to = [ink, ground]
      this.span = 0
      return [ink, ground]
    }
    if (!sameColor(ink, to[0]) || !sameColor(ground, to[1])) {
      this.from = this.shown(ask.now)
      this.to = [ink, ground]
      this.at = ask.now
      this.span = ask.left > 0 ? ask.left : ask.alone
    }
    return this.shown(ask.now)
  }

  /** The colors on the screen at `now`, part way through a crossing or at its end. */
  private shown(now: number): [Ink, Ink] {
    const from = this.from
    const to = this.to ?? from
    if (!to) {
      return [
        [128, 128, 128, 1],
        [128, 128, 128, 1],
      ]
    }
    const k = this.span <= 0 ? 1 : Math.min(1, (now - this.at) / this.span)
    if (!from || k >= 1) {
      return [to[0], to[1]]
    }
    const eased = smoother(k)
    return [mixInk(from[0], to[0], eased), mixInk(from[1], to[1], eased)]
  }
}
