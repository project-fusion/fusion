/**
 * How many WebGL contexts the three.js driver keeps live on one page.
 *
 * **A browser holds only so many, and drops the oldest without asking**:
 * Chrome about sixteen on a desktop and fewer on a phone. A page of 3D panels
 * past that lost a graph it could not get back, and the maps, Aura, and
 * Strands on the same page count against the same limit. Six leaves them
 * room.
 */
export const LIVE = 6

/** One drawing that holds a context: it gives the context back, and takes it again. */
export interface Holder {
  release(): void
  restore(): void
}

/**
 * Keeps the contexts a page's drawings hold under `cap`.
 *
 * **A drawing near the screen always keeps its context.** Past the cap, the
 * drawings off screen give theirs back, the one away longest first, and each
 * takes its context again as it comes near. So a page of any number of
 * graphs holds as many contexts as it shows at once, and never more than
 * `cap` beyond that.
 */
export const contextBudget = (cap: number = LIVE) => {
  const holding = new Set<Holder>()
  /* Each drawing off screen, and since when. */
  const away = new Map<Holder, number>()
  const balance = (): void => {
    const longest = [...away]
      .filter(([holder]) => holding.has(holder))
      .sort((one, other) => one[1] - other[1])
    for (const [holder] of longest) {
      if (holding.size <= cap) {
        return
      }
      holding.delete(holder)
      holder.release()
    }
  }
  return {
    /** A drawing far from the screen, from `now`. */
    far(holder: Holder, now: number): void {
      away.set(holder, now)
      balance()
    },
    /** How many drawings hold a context now. */
    get holding(): number {
      return holding.size
    },
    /** A new drawing, which made a context to draw with. */
    join(holder: Holder): void {
      holding.add(holder)
      balance()
    },
    /** A drawing that ended and freed its context itself. */
    leave(holder: Holder): void {
      holding.delete(holder)
      away.delete(holder)
    },
    /** A drawing near the screen, which takes its context again where it gave it back. */
    near(holder: Holder): void {
      away.delete(holder)
      if (!holding.has(holder)) {
        holding.add(holder)
        holder.restore()
      }
      balance()
    },
  }
}

/** The budget every three.js driver on the page shares. */
export const pageBudget = contextBudget()
