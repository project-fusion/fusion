/**
 * Where each item of a waterfall stands: a set laid out down several columns
 * of one width, each item under the shortest column so far, as a masonry wall
 * of photos is.
 *
 * **Its own module, which a host hands to `VirtualizeController`**, so the
 * hosts that window a single column carry none of it. The controller asks it
 * which items reach the box and where each one starts, and the host draws each
 * item at its column and its start.
 *
 * **Placed in the order of the set, each item under the column that ends
 * highest**, the leftmost of a tie, as React Aria's `WaterfallLayout` and
 * TanStack Virtual's lanes place them. So an item's start is never above the
 * start of the item before it, and the first item to reach any offset is found
 * by a binary search, as one column finds it.
 *
 * Sizes are the controller's: what was measured, or the estimate, each with
 * the gap below it.
 */
export class Waterfall {
  /** How many columns the items are laid out in, at least one. */
  lanes = 1

  /** Where each item starts, in pixels from the top of the set. */
  private starts: number[] = []

  /** The column each item stands in. */
  private columns: number[] = []

  /** How much room each item takes, with the gap below it. */
  private sizes: number[] = []

  /** How far down the set the items `[0, i]` reach, the furthest of their ends. */
  private reach: number[] = []

  /** How long the set is: where its longest column ends. */
  private extent = 0

  /** What the placement was built from, so it is built again only when that changes. */
  private built = ''

  /**
   * Places `count` items whose sizes `size` gives, unless `stamp` says the
   * sizes, the count and the columns are the ones already placed.
   */
  place(count: number, size: (index: number) => number, stamp: string): void {
    const lanes = Math.max(1, Math.trunc(this.lanes) || 1)
    const key = `${count}:${lanes}:${stamp}`
    if (key === this.built) {
      return
    }
    this.built = key
    const ends = new Array<number>(lanes).fill(0)
    this.starts = new Array(count)
    this.columns = new Array(count)
    this.sizes = new Array(count)
    this.reach = new Array(count)
    let furthest = 0
    for (let index = 0; index < count; index++) {
      let lane = 0
      for (let other = 1; other < lanes; other++) {
        if ((ends[other] ?? 0) < (ends[lane] ?? 0)) {
          lane = other
        }
      }
      const start = ends[lane] ?? 0
      const room = size(index)
      const end = start + room
      ends[lane] = end
      furthest = Math.max(furthest, end)
      this.starts[index] = start
      this.columns[index] = lane
      this.sizes[index] = room
      this.reach[index] = furthest
    }
    this.extent = furthest
  }

  /** Where item `index` starts, and where the set ends for an index past it. */
  start(index: number): number {
    return this.starts[index] ?? this.extent
  }

  /** The column item `index` stands in. */
  lane(index: number): number {
    return this.columns[index] ?? 0
  }

  /** How long the set is, where its longest column ends. */
  length(): number {
    return this.extent
  }

  /**
   * How far down the set the items from the start through `index` reach: the
   * furthest of their ends, which is the bottom of the columns they occupy.
   */
  reachThrough(index: number): number {
    return index < 0 ? 0 : (this.reach[index] ?? this.extent)
  }

  /** The first item that reaches past `offset`, or the count where none does. */
  from(offset: number): number {
    return this.search(this.reach, offset)
  }

  /** The first item that starts at or past `offset`, so every item before it starts above. */
  to(offset: number): number {
    return this.search(this.starts, offset - 1e-6)
  }

  /** The first index whose number in `sorted` is past `offset`. */
  private search(sorted: readonly number[], offset: number): number {
    let low = 0
    let high = sorted.length
    while (low < high) {
      const mid = (low + high) >> 1
      if ((sorted[mid] ?? 0) <= offset) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    return low
  }

  /**
   * Which item a key moves to from `at`, in a set of `count` items, or
   * `undefined` for a key it does not take or where there is no item that way:
   *
   * - Down and Up move to the next or the previous item in the same column.
   * - `next` and `previous` move to the column beside, to its item that sits
   *   beside this one the most, or the nearest above where none does. Which
   *   of Left and Right is `next` is the caller's, for a right-to-left page.
   * - Page Down and Page Up move down or up the same column by `page` pixels,
   *   to the item there, or the last item that way.
   */
  step(key: string, at: number, count: number, page: number): number | undefined {
    const lane = this.lane(at)
    const along = (way: 1 | -1, from = at): number | undefined => {
      for (let other = from + way; other >= 0 && other < count; other += way) {
        if (this.lane(other) === lane) {
          return other
        }
      }
      return undefined
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      return along(key === 'ArrowDown' ? 1 : -1)
    }
    if (key === 'PageDown' || key === 'PageUp') {
      const way = key === 'PageDown' ? 1 : -1
      const goal = this.start(at) + way * Math.max(1, page)
      let found = at
      for (let next = along(way); next !== undefined; next = along(way, next)) {
        found = next
        if (way > 0 ? this.start(next) + this.size(next) > goal : this.start(next) <= goal) {
          break
        }
      }
      return found === at ? undefined : found
    }
    if (key !== 'next' && key !== 'previous') {
      return undefined
    }
    const beside = lane + (key === 'next' ? 1 : -1)
    if (beside < 0 || beside >= Math.max(1, Math.trunc(this.lanes) || 1)) {
      return undefined
    }
    const top = this.start(at)
    const bottom = top + this.size(at)
    let best: number | undefined
    let most = 0
    let above: number | undefined
    for (let other = Math.max(0, this.from(top) - this.lanes); other < count; other++) {
      const start = this.start(other)
      if (start >= bottom) {
        break
      }
      if (this.lane(other) !== beside) {
        continue
      }
      const overlap = Math.min(bottom, start + this.size(other)) - Math.max(top, start)
      if (overlap > most) {
        best = other
        most = overlap
      }
      above = other
    }
    if (best !== undefined || above !== undefined) {
      return best ?? above
    }
    for (let other = at - 1; other >= 0; other--) {
      if (this.lane(other) === beside) {
        return other
      }
    }
    return undefined
  }

  /** How much room item `index` takes down its column, with the gap below it. */
  private size(index: number): number {
    return this.sizes[index] ?? 0
  }
}
