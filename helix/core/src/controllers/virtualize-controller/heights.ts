/**
 * Where each item starts, when the items are not all the same height.
 *
 * **The fixed-estimate window is a straight line and this is the other case
 * the controller's own note defers.** With one estimate, offset and index
 * convert by division, which can never disagree with itself. A transcript whose
 * last message grows every token, or a table row that wraps, has no such line:
 * the only way to place item 900 is to know what the 899 above it came to.
 *
 * **Measured where it has been seen, estimated everywhere else.** An item is
 * measured once it has been rendered, and until then it stands at the estimate,
 * so a set of ten thousand costs ten thousand numbers rather than ten thousand
 * layouts. The estimate is read per call rather than captured, because a host
 * may change it and the sums have to move with it.
 *
 * **The prefix sums are rebuilt from the first index that changed**, not from
 * zero and not on every read. Recording a height marks that index dirty;
 * nothing is recomputed until somebody asks a question that needs it. A scroll
 * that records twelve rows therefore pays one rebuild rather than twelve, and a
 * scroll that records none pays nothing.
 */
export class Heights {
  private readonly estimate: () => number

  /** Heights that have been seen, by index. Sparse on purpose. */
  private readonly seen = new Map<number, number>()

  /** `sums[i]` is the room items `[0, i)` take. One longer than the count. */
  private sums: number[] = [0]

  /** The first index whose sum is no longer trustworthy. */
  private dirty = 0

  /** The estimate the sums were built against, so a change to it rebuilds. */
  private built = 0

  constructor(estimate: () => number) {
    this.estimate = estimate
  }

  /** How tall one item is: what was measured, or what is assumed. */
  at(index: number): number {
    return this.seen.get(index) ?? Math.max(1, this.estimate())
  }

  /**
   * Records a height, and says whether it was news.
   *
   * The answer matters to the caller rather than here: a height that differs
   * from what was assumed moves the window, and the controller has to know that
   * the move came from outside rather than from itself.
   */
  record(index: number, size: number): boolean {
    if (index < 0 || !Number.isFinite(size) || size <= 0) {
      return false
    }
    const rounded = Math.round(size)
    if (this.seen.get(index) === rounded) {
      return false
    }
    const was = this.at(index)
    this.seen.set(index, rounded)
    if (rounded === was) {
      /* The first sighting of an item that is exactly its estimate. Worth
         storing, so it stops being a guess, and not worth a rebuild. */
      return false
    }
    this.dirty = Math.min(this.dirty, index)
    return true
  }

  /** The room items `[0, index)` take. */
  before(index: number, count: number): number {
    this.build(count)
    return this.sums[Math.max(0, Math.min(index, count))] ?? 0
  }

  /** The room the whole set takes. */
  total(count: number): number {
    return this.before(count, count)
  }

  /**
   * The last item that starts at or before `offset`.
   *
   * A binary search rather than a walk, so a reader dragging the thumb to the
   * end of ten thousand rows costs fourteen comparisons rather than ten
   * thousand.
   */
  indexAt(offset: number, count: number): number {
    if (count <= 0) {
      return 0
    }
    this.build(count)
    const target = Math.max(0, offset)
    let low = 0
    let high = count
    while (low < high) {
      const mid = (low + high) >> 1
      if ((this.sums[mid + 1] ?? 0) <= target) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    return Math.min(low, count - 1)
  }

  /**
   * Moves every height along by `by` places, for a set that grew at its start.
   *
   * A transcript loading its history prepends, and every item already measured
   * is now `by` further down the set. Moved rather than forgotten, because the
   * measurements are still true of the same items: forgetting would put every
   * one of them back at the estimate at the moment the reader is looking at them.
   */
  shift(by: number): void {
    if (by === 0) {
      return
    }
    const moved = [...this.seen].map(([index, size]) => [index + by, size] as const)
    this.seen.clear()
    for (const [index, size] of moved) {
      if (index >= 0) {
        this.seen.set(index, size)
      }
    }
    this.dirty = 0
  }

  /**
   * Drops everything, for a set that is no longer the same set.
   *
   * A host that swaps its data has heights recorded against indices that now
   * name different items, and keeping them is worse than having none: the
   * estimate is honest about not knowing where a stale measurement is not.
   */
  forget(): void {
    this.seen.clear()
    this.dirty = 0
    this.sums = [0]
  }

  /** Brings the sums up to date, from the first index that changed. */
  private build(count: number): void {
    const size = Math.max(1, this.estimate())
    if (size !== this.built) {
      /* Every unmeasured item moved, and they are everywhere, so there is no
         first-changed index short of the beginning. */
      this.built = size
      this.dirty = 0
    }
    if (this.dirty > count && this.sums.length === count + 1) {
      return
    }
    const from = Math.min(this.dirty, count)
    if (this.sums.length !== count + 1) {
      this.sums.length = count + 1
    }
    let running = this.sums[from] ?? 0
    for (let index = from; index < count; index++) {
      this.sums[index] = running
      running += this.at(index)
    }
    this.sums[count] = running
    this.dirty = count + 1
  }
}
