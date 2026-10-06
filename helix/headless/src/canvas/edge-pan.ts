/**
 * Moving the view while something is carried to its edge: a card, a corner, a
 * connection being drawn, or the box that selects.
 *
 * **A board is larger than its box, and a hand stops at the edge of the box.**
 * Without this, carrying a card to a place off screen took a drop at the edge,
 * a pan, and a second pick-up, and a connection to a card off screen could not
 * be drawn by pointer at all.
 */

/** A point on screen, in pixels. */
export interface EdgePoint {
  x: number
  y: number
}

/** The box the view is drawn in, on screen. */
export interface EdgeRect {
  bottom: number
  left: number
  right: number
  top: number
}

/** How near an edge, in pixels, the view starts to move. */
export const EDGE_ZONE = 32

/** The most the view moves in one frame, in pixels: at the edge and past it. */
export const EDGE_MOST = 12

/**
 * How far the view should move toward each side in one frame, in pixels, for
 * a pointer at `point`: positive toward the right and the bottom, nothing
 * outside the zone, and faster the nearer the edge, up to `most` at it and
 * past it.
 *
 * A box narrower than two zones moves only once the pointer is past its edge,
 * so a small board is not always moving.
 */
export const edgeSpeed = (
  point: EdgePoint,
  rect: EdgeRect,
  zone = EDGE_ZONE,
  most = EDGE_MOST,
): EdgePoint => {
  const along = (at: number, start: number, end: number): number => {
    if (at >= end) {
      return 1
    }
    if (at <= start) {
      return -1
    }
    const reach = end - start < zone * 2 ? 0 : zone
    if (reach > 0 && at > end - reach) {
      return (at - (end - reach)) / reach
    }
    if (reach > 0 && at < start + reach) {
      return -(start + reach - at) / reach
    }
    return 0
  }
  return {
    x: Math.round(along(point.x, rect.left, rect.right) * most),
    y: Math.round(along(point.y, rect.top, rect.bottom) * most),
  }
}

/**
 * The frames that move the view while a pointer holds something near an edge.
 *
 * `follow` with every pointer move keeps it going while the pointer is in the
 * zone, and `stop` ends it, which the board calls when the gesture ends and
 * when it leaves the page. Each frame hands `step` how far to move, and the
 * board moves the view and carries what is in hand with it.
 */
export class EdgePan {
  /** The frame asked for, while the view is moving. */
  private frame: number | undefined

  /** Where the pointer last was. */
  private point: EdgePoint | undefined

  constructor(
    private readonly rect: () => EdgeRect | undefined,
    private readonly step: (by: EdgePoint) => void,
    private readonly ended: () => void = () => undefined,
  ) {}

  /** Whether the view is moving. */
  get moving(): boolean {
    return this.frame !== undefined
  }

  /** Where the pointer is now, which starts the frames where it is in the zone. */
  follow(point: EdgePoint): void {
    this.point = point
    const by = this.speed()
    if (this.frame === undefined && (by.x !== 0 || by.y !== 0)) {
      this.frame = requestAnimationFrame(this.tick)
    }
  }

  /** Ends the frames. */
  stop(): void {
    this.point = undefined
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame)
      this.frame = undefined
      this.ended()
    }
  }

  private speed(): EdgePoint {
    const rect = this.rect()
    return this.point && rect ? edgeSpeed(this.point, rect) : { x: 0, y: 0 }
  }

  private readonly tick = (): void => {
    const by = this.speed()
    if (by.x === 0 && by.y === 0) {
      this.frame = undefined
      this.ended()
      return
    }
    this.step(by)
    this.frame = requestAnimationFrame(this.tick)
  }
}
