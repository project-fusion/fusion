/**
 * Whether a box that scrolls keeps its newest content in view: the arithmetic
 * Log reads on the web and on a phone, which Chat can bind too. It knows only
 * lengths along the axis the box scrolls, so a scroll view, a list, and an
 * element all ask it the same questions.
 */

/** Where a box that scrolls stands. */
export interface TailStanding {
  /** How long what it holds is. */
  readonly content: number
  /** How long the box is. */
  readonly frame: number
  /** How far it has scrolled. */
  readonly offset: number
}

/** The furthest a box can scroll. */
export const tailOffset = ({ content, frame }: TailStanding): number => Math.max(0, content - frame)

/** Whether a box stands within `threshold` of its newest content. */
export const atTail = (standing: TailStanding, threshold: number): boolean =>
  standing.content - standing.offset - standing.frame <= Math.max(0, threshold)

/**
 * What a scroll means to a box that may be following its newest content:
 * `stay` changes nothing, `stick` goes back to the newest content under a reader
 * who did not move, `follow` holds it again, and `let-go` leaves it.
 */
export type TailTurn = 'follow' | 'let-go' | 'stay' | 'stick'

/**
 * What a scroll to `standing` means. `stuckAt` is the offset the box itself
 * last set, which a reader has not moved from: **a scroll the box made, and
 * the box growing under a reader who has not moved, are not the reader
 * leaving.**
 */
export const tailTurn = (
  standing: TailStanding,
  following: boolean,
  stuckAt: number,
  threshold: number,
): TailTurn => {
  const at = atTail(standing, threshold)
  if (following && !at && standing.offset >= stuckAt - 1) {
    return 'stick'
  }
  if (at === following) {
    return 'stay'
  }
  return at ? 'follow' : 'let-go'
}
