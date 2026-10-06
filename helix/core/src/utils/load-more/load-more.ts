/** Where a scrolling set stands, for the question of whether to ask for more. */
export interface EndInSight {
  /** The length the set last asked for more at, or `-1` where it never has. */
  askedAt: number
  /** The set's length now, which the answer is kept for. */
  count: number
  /** How far below the bottom of the box the set goes, in pixels. */
  remaining: number
  /** The box's own height, in pixels: one screen. */
  screen: number
}

/**
 * Whether a reader has come within one screen of the end of a set, and the
 * set has not already asked for more at this length: React Aria's
 * `onLoadMore` rule.
 *
 * **Once for each length**, so a scroll that goes on asks again only after the
 * next page arrived and the length moved. False while the box has no height or
 * the set no items, so a list that has not been laid out asks for nothing.
 * The caller keeps `askedAt`, setting it to `count` when this answers true.
 *
 * Listbox asks this of its own scroll, and `VirtualizeController.endInSight`
 * of the rows it lays out, so the two lists ask on the same terms.
 */
export const endInSight = ({ askedAt, count, remaining, screen }: EndInSight): boolean =>
  count > 0 && screen > 0 && askedAt !== count && remaining <= screen
