import { describe, expect, test } from 'bun:test'
import { VirtualizeController } from './virtualize-controller.js'

/**
 * The arithmetic on its own, with a box that reports numbers and nothing else.
 *
 * No DOM and no layout: what is being asked here is whether an offset and a
 * height turn into the right slice, which is a function of three numbers. A
 * browser is needed to know whether the scroller is the right element, and that
 * is a different question asked in a different place.
 */
const box = (scrollTop: number, clientHeight: number): HTMLElement =>
  ({
    addEventListener: () => {},
    clientHeight,
    removeEventListener: () => {},
    scrollTop,
  }) as unknown as HTMLElement

const host = () => {
  let updates = 0
  return {
    addController: () => {},
    addEventListener: () => {},
    removeController: () => {},
    requestUpdate: () => {
      updates += 1
    },
    updateComplete: Promise.resolve(true),
    get updates(): number {
      return updates
    },
  }
}

const windowFor = (
  scrollTop: number,
  { count = 10_000, estimate = 32, height = 320, overscan = 4 } = {},
) => {
  const owner = host()
  const controller = new VirtualizeController(owner, {
    container: () => box(scrollTop, height),
    count: () => count,
    estimate: () => estimate,
    overscan,
  })
  controller.measure()
  return { owner, window: controller.window }
}

describe('the window a scroll offset asks for', () => {
  test('starts at the top, with overscan clamped away', () => {
    /* `first` cannot go below zero however much overscan is asked for, or the
       spacer before it is negative and the list starts above its own box. */
    expect(windowFor(0).window).toEqual({ after: 319_424, before: 0, first: 0, last: 18 })
  })

  test('moves with the offset, and the spacers move with it', () => {
    const { window } = windowFor(3200)
    /* 3200 / 32 is row 100, less four of overscan. Ten rows fit in 320, plus
       eight of overscan either side. */
    expect([window.first, window.last]).toEqual([96, 114])
    /* The room the absent rows would have taken, which is what keeps the
       scrollbar honest: 96 rows above and 9,886 below, at 32 each. */
    expect([window.before, window.after]).toEqual([3072, 316_352])
  })

  test('stops at the end rather than running past it', () => {
    const { window } = windowFor(10_000 * 32)
    expect(window.last).toBe(10_000)
    expect(window.after).toBe(0)
  })

  test('an empty set asks for nothing', () => {
    expect(windowFor(0, { count: 0 }).window).toEqual({ after: 0, before: 0, first: 0, last: 0 })
  })

  test('the spacers and the rendered rows account for every item', () => {
    const { window } = windowFor(5000)
    const rendered = window.last - window.first
    const total = window.before / 32 + rendered + window.after / 32
    expect(total).toBe(10_000)
  })
})

describe('what it asks the host to do', () => {
  test('asks for one update when the slice moves', () => {
    const owner = host()
    let top = 0
    const controller = new VirtualizeController(owner, {
      container: () => box(top, 320),
      count: () => 10_000,
      estimate: () => 32,
    })
    controller.measure()
    top = 3200
    controller.measure()
    expect(owner.updates).toBe(2)
  })

  test('and none at all while it has not', () => {
    /* A scroll fires many events a frame and most land inside the row already
       at the top. Asking for an update per event re-renders the list for every
       pixel, which is the cost this whole controller exists to avoid. */
    const owner = host()
    let top = 0
    const controller = new VirtualizeController(owner, {
      container: () => box(top, 320),
      count: () => 10_000,
      estimate: () => 32,
    })
    controller.measure()
    const after = owner.updates
    for (top = 1; top < 32; top += 1) {
      controller.measure()
    }
    expect(owner.updates).toBe(after)
  })

  test('and nothing at all before there is a box to read', () => {
    const owner = host()
    const controller = new VirtualizeController(owner, {
      container: () => null,
      count: () => 10_000,
      estimate: () => 32,
    })
    controller.measure()
    expect([owner.updates, controller.window.last]).toEqual([0, 0])
  })
})

/**
 * The box the browser actually produced, reporting the heights it reported.
 *
 * **A scroller with no height of its own**, which is what the headless tier is
 * until a consumer's stylesheet gives it one: `clientHeight` is then the rows
 * just drawn plus the two spacers, so measuring moves what is being measured.
 *
 * It does not diverge, and that is what made it hard to see. Measured in
 * Chromium with 500 rows against an estimate of 32, it converged toward a
 * non-integer and then quantized into a two-cycle: 11842 pixels reads as 379
 * rows, 379 rows lay out as 11831 pixels, 11831 reads as 378, and 378 lay out
 * as 11842. Two-and-a-half thousand passes in eight seconds, forever.
 *
 * **The two heights are the measured ones rather than a row height chosen to
 * produce them.** A first attempt gave the rows a plausible 18.7 pixels each
 * and it *converged*, in nine passes, warning about nothing: the fault is the
 * cycle, and a stub that only approximates the physics does not have one.
 */
const CYCLE = { at378: 11_842, at379: 11_831 }

const unstable = () => {
  let updates = 0
  let warnings = 0
  const owner = {
    addController: () => {},
    addEventListener: () => {},
    removeController: () => {},
    requestUpdate: () => {
      updates += 1
      /* The render the host would do, which is the half that closes the loop:
         what it draws decides the height the next measurement reads. Bounded
         here only so a controller with no guard fails this file rather than
         hanging it. */
      if (updates < 200) {
        made.measure()
      }
    },
    updateComplete: Promise.resolve(true),
  }
  const made = new VirtualizeController(owner as never, {
    container: () =>
      ({
        addEventListener: () => {},
        get clientHeight(): number {
          return made.window.last === 378 ? CYCLE.at378 : CYCLE.at379
        },
        removeEventListener: () => {},
        scrollTop: 0,
      }) as unknown as HTMLElement,
    count: () => 500,
    estimate: () => 32,
  })
  const real = console.warn
  console.warn = (): void => {
    warnings += 1
  }
  try {
    made.measure()
  } finally {
    console.warn = real
  }
  return { controller: made, updates: () => updates, warnings: () => warnings }
}

describe('a box whose height depends on what was drawn into it', () => {
  /* Ten passes, not a deadline. Every deadline written to catch this is a
     `setTimeout`, and a microtask loop is exactly the thing a timer cannot
     interrupt. */
  test('is measured a bounded number of times rather than forever', () => {
    const run = unstable()
    expect(run.updates()).toBeLessThanOrEqual(10)
  })

  /* The last window is the one that is *rendered*. Adopting the newest reading
     and refusing the update would leave the two disagreeing with no way back:
     the next measurement would find them the same and do nothing. */
  test('and holds a window rather than none', () => {
    const run = unstable()
    expect(run.controller.window.last).toBeGreaterThan(0)
  })

  /* A warning rather than a throw: the list still works, it still draws rows,
     and a reader can still scroll. What it cannot do is choose the window well,
     and that is the consumer's stylesheet to fix. */
  test('and says so once, naming the thing the consumer can change', () => {
    const run = unstable()
    expect(run.warnings()).toBe(1)
  })
})

describe('a box with a height of its own', () => {
  /* The ordinary case, and the one the bound must not touch: a real scroller
     reports the same height whatever is drawn in it, so the second measurement
     agrees with the first and there is nothing to count. */
  test('settles, and is never accused of anything', () => {
    let updates = 0
    let warnings = 0
    const owner = {
      addController: () => {},
      addEventListener: () => {},
      removeController: () => {},
      requestUpdate: () => {
        updates += 1
        made.measure()
      },
      updateComplete: Promise.resolve(true),
    }
    const made = new VirtualizeController(owner as never, {
      container: () =>
        ({
          addEventListener: () => {},
          clientHeight: 320,
          removeEventListener: () => {},
          scrollTop: 0,
        }) as unknown as HTMLElement,
      count: () => 500,
      estimate: () => 32,
    })
    const real = console.warn
    console.warn = (): void => {
      warnings += 1
    }
    try {
      made.measure()
    } finally {
      console.warn = real
    }
    expect([updates, warnings]).toEqual([1, 0])
  })
})

describe('a list being scrolled for a long time', () => {
  /**
   * The bound counts a runaway, not work.
   *
   * Every real move is two measurements: the one that sees the new offset and
   * changes the window, and the one after the render that agrees with it. The
   * second is what clears the count, so a reader scrolling all afternoon never
   * approaches the bound. Without that reset the tenth move would be the last
   * one this answered, and the list would quietly stop following the scrollbar.
   */
  test('keeps answering, however many moves it has already answered', () => {
    let updates = 0
    let warnings = 0
    let top = 0
    const owner = {
      addController: () => {},
      addEventListener: () => {},
      removeController: () => {},
      requestUpdate: () => {
        updates += 1
        // The measurement after the render, which is the one that agrees.
        made.measure()
      },
      updateComplete: Promise.resolve(true),
    }
    const made = new VirtualizeController(owner as never, {
      container: () =>
        ({
          addEventListener: () => {},
          clientHeight: 320,
          removeEventListener: () => {},
          get scrollTop(): number {
            return top
          },
        }) as unknown as HTMLElement,
      count: () => 10_000,
      estimate: () => 32,
    })
    const real = console.warn
    console.warn = (): void => {
      warnings += 1
    }
    try {
      for (let move = 1; move <= 40; move += 1) {
        top = move * 320
        made.measure()
      }
    } finally {
      console.warn = real
    }
    expect([updates, warnings]).toEqual([40, 0])
    expect(made.window.first).toBeGreaterThan(300)
  })
})
