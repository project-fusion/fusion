import { ticks } from './ticks.js'

/** One level a scale rules, as `levelsOf` gives it. */
export interface Level {
  /**
   * Whether the scale before this one ruled the level and this one does not.
   * A chart draws such a level hidden, at its place on the new scale, so a
   * stylesheet can fade it out as it moves there with the others.
   */
  leaving: boolean
  /** The value the level is at. */
  level: number
}

/**
 * The levels a scale rules, followed by the levels the scale before it ruled
 * that it does not.
 *
 * **A rule or a number that stays on the axis is the same element**, keyed by
 * its value, so a stylesheet moves it from its place on the old scale to its
 * place on the new one. A level the new scale adds is a new element, which a
 * stylesheet fades in. A level the new scale drops says `leaving`, so the
 * chart can keep it through its fade.
 *
 * **In order of value, the leaving among the rest.** Kept that way, a keyed
 * list moves no element it keeps from one place in the list to another, and
 * an element moved in the document starts its style afresh: it would fade in
 * again and never travel.
 *
 * @param domain The scale's lowest and highest values.
 * @param before The scale before this one, which `ScaleMemory` holds, or nothing.
 */
export const levelsOf = (
  domain: readonly [number, number],
  before?: readonly [number, number],
): Level[] => {
  const now = ticks(domain)
  const gone = before === undefined ? [] : ticks(before).filter((level) => !now.includes(level))
  return [
    ...now.map((level) => ({ leaving: false, level })),
    ...gone.map((level) => ({ leaving: true, level })),
  ].sort((one, other) => one.level - other.level)
}

/**
 * The scale a chart drew before the one it draws now, for `levelsOf`.
 *
 * **Held until the scale changes again.** A chart draws again on every move
 * of the pointer, so a scale held for one drawing would take the levels the
 * last change dropped away in the middle of their fade. They stay, hidden, until the
 * next change, which drops them for good.
 */
export class ScaleMemory {
  private now: readonly [number, number] | undefined

  private was: readonly [number, number] | undefined

  /**
   * Records the scale drawn now and gives the one drawn before it, or nothing
   * on the first drawing.
   *
   * @param domain The scale's lowest and highest values.
   */
  before(domain: readonly [number, number]): readonly [number, number] | undefined {
    if (this.now === undefined || this.now[0] !== domain[0] || this.now[1] !== domain[1]) {
      this.was = this.now
      this.now = [domain[0], domain[1]]
    }
    return this.was
  }
}

/**
 * Where a leaving level stands on the new scale, held inside the plot, so a
 * number the scale stretched far past its end fades out at the end it left
 * from.
 *
 * @param place A level's place along the plot, from 0 to 100.
 */
export const heldInside = (place: number): number => Math.min(100, Math.max(0, place))
