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

  test('an offset left past the end of a set that shrank still asks for the set', () => {
    /* A box clamps its offset only after the content under it has shrunk, so
       for a pass the offset is past the last item. Started there, the window
       held nothing and moved again when the offset came back. */
    expect(windowFor(20_000, { count: 1 }).window).toEqual({
      after: 0,
      before: 0,
      first: 0,
      last: 1,
    })
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
 * **The two heights are the measured ones, never a row height chosen to produce
 * them.** The fault is the cycle, and a stub that only approximates the physics
 * converges instead and warns about nothing.
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

/**
 * A box whose `scrollTop` can be written, which the measured path needs.
 *
 * The uniform helper above hands back a fresh object per call and never reads
 * a write, which is right for arithmetic and useless for anchoring: the whole
 * assertion there is that the controller *moved* the reader.
 */
const scroller = (scrollTop: number, clientHeight: number) => {
  const it = {
    addEventListener: () => {},
    clientHeight,
    removeEventListener: () => {},
    scrollTop,
  }
  return it as unknown as HTMLElement & { scrollTop: number }
}

/** Rows of a fixed height, standing in for what a host just rendered. */
const drawn = (heights: number[], from = 0) =>
  heights.map((height, at) => ({
    element: { getBoundingClientRect: () => ({ height }) } as unknown as HTMLElement,
    index: from + at,
  }))

describe('a set whose items are not the same height', () => {
  test('places by what was measured rather than by the estimate', () => {
    const owner = host()
    const box = scroller(0, 100)
    let rows: ReturnType<typeof drawn> = []
    const controller = new VirtualizeController(owner, {
      container: () => box,
      count: () => 100,
      estimate: () => 10,
      overscan: 0,
      rows: () => rows,
    })

    controller.measure()
    // Nothing measured yet, so ten items of ten fill the hundred-pixel box.
    expect(controller.window.first).toBe(0)
    expect(controller.window.before).toBe(0)

    // The first row turns out to be a hundred tall, so it fills the box alone.
    rows = drawn([100])
    controller.hostUpdated()
    expect(controller.window.first).toBe(0)
    expect(controller.window.last).toBe(1)
    // 100 for the measured row, then 99 unmeasured at ten.
    expect(controller.window.after).toBe(990)
  })

  test('holds the reader still when something above them grows', () => {
    /* The reason the measured path is not simply the uniform one with better
       numbers. An item above the window turning out taller moves everything
       below it, and a reader watching the middle of a list would see it walk. */
    const owner = host()
    const box = scroller(500, 100)
    const controller = new VirtualizeController(owner, {
      container: () => box,
      count: () => 1000,
      estimate: () => 10,
      overscan: 0,
      rows: () => drawn([30], 50),
    })

    controller.measure()
    const first = controller.window.first
    expect(first).toBe(50)

    controller.hostUpdated()
    /* Item 50 measured 30 rather than 10, so everything from 51 down moved by
       twenty, and the offset moved with it. */
    expect(box.scrollTop).toBe(500)
    expect(controller.window.before).toBe(500)
  })

  test('stops asking, because a height is news exactly once', () => {
    /* What bounds the loop the fixed-estimate note warns about: measuring feeds
       the window and the window feeds the render. The second pass over the same
       rows records nothing new, so it returns without asking for an update. */
    const owner = host()
    const box = scroller(0, 100)
    const rows = drawn([40, 40, 40])
    const controller = new VirtualizeController(owner, {
      container: () => box,
      count: () => 50,
      estimate: () => 10,
      overscan: 0,
      rows: () => rows,
    })

    controller.measure()
    controller.hostUpdated()
    const settled = owner.updates
    controller.hostUpdated()
    expect(owner.updates).toBe(settled)
  })

  test('keeps the straight line when no rows are offered', () => {
    /* The option is the switch. Without it nothing is measured and the window
       is the division it always was, which is what every existing consumer
       gets. */
    const owner = host()
    const controller = new VirtualizeController(owner, {
      container: () => box(0, 320),
      count: () => 10_000,
      estimate: () => 32,
    })
    controller.measure()
    controller.hostUpdated()
    expect(controller.window).toEqual({ after: 319_424, before: 0, first: 0, last: 18 })
  })

  test('forgets on request, for a host that swapped its set', () => {
    const owner = host()
    const box = scroller(0, 100)
    const controller = new VirtualizeController(owner, {
      container: () => box,
      count: () => 100,
      estimate: () => 10,
      overscan: 0,
      rows: () => drawn([100]),
    })
    controller.measure()
    controller.hostUpdated()
    expect(controller.window.after).toBe(990)

    controller.forget()
    controller.measure()
    // Back to a hundred items of ten, less the ten that fit.
    expect(controller.window.after).toBe(900)
  })
})

describe('an item a host has to show that is outside the window', () => {
  /* A writable box, so the offset `reveal` writes can be read back. */
  const scroller = (scrollTop: number, clientHeight: number) =>
    ({
      addEventListener: () => {},
      clientHeight,
      removeEventListener: () => {},
      scrollTop,
    }) as unknown as HTMLElement

  test('is scrolled to the least distance that shows it whole', () => {
    const container = scroller(0, 320)
    const controller = new VirtualizeController(host(), {
      container: () => container,
      count: () => 10_000,
      estimate: () => 32,
    })
    controller.reveal(500)
    // Its bottom at the box's bottom: 501 rows of 32, less the 320 that show.
    expect(container.scrollTop).toBe(501 * 32 - 320)
    controller.reveal(2)
    expect(container.scrollTop).toBe(64)
    // Already whole in view: nothing moves.
    controller.reveal(4)
    expect(container.scrollTop).toBe(64)
  })

  test('below a heading that covers the top of the box', () => {
    const container = scroller(0, 320)
    const controller = new VirtualizeController(host(), {
      container: () => container,
      count: () => 10_000,
      estimate: () => 32,
    })
    controller.reveal(500, 40)
    expect(container.scrollTop).toBe(501 * 32 + 40 - 320)
  })

  test('has its own measured height, for the spacer that gives up its room', () => {
    const row = { getBoundingClientRect: () => ({ height: 48 }) } as unknown as HTMLElement
    const controller = new VirtualizeController(host(), {
      container: () => scroller(0, 320),
      count: () => 100,
      estimate: () => 32,
      rows: () => [{ element: row, index: 3 }],
    })
    controller.hostUpdated()
    expect(controller.sizeOf(3)).toBe(48)
    expect(controller.sizeOf(4)).toBe(32)
  })
})
