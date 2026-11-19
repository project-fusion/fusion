import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { mix } from '../../utils/readings-motion/readings-motion.js'
import { ReadingsMotionController } from './readings-motion-controller.js'

beforeAll(() => {
  registerDom()
})

/** Readings the test draws: each by its name, with the step it grows in at. */
interface Field {
  readings: Array<{ name: string; step: number; value: number }>
}

const field = (...values: Array<[string, number]>): Field => ({
  readings: values.map(([name, value], step) => ({ name, step, value })),
})

/** Each item `at` its share, matched by name; one that left shrinks to zero after the rest. */
const between = (
  from: Field | undefined,
  to: Field,
  at: { floor(key: string): boolean; share(key: string): number },
): Field => {
  const before = new Map(from?.readings.map((one) => [one.name, one.value]))
  const readings = to.readings.map((one) => {
    const old = before.get(one.name)
    const start = old === undefined || at.floor(one.name) ? 0 : old
    return { ...one, value: mix(start, one.value, at.share(one.name)) }
  })
  for (const [name, value] of before) {
    if (!to.readings.some((one) => one.name === name) && at.share(name) < 1) {
      readings.push({ name, step: 0, value: mix(value, 0, at.share(name)) })
    }
  }
  return { readings }
}

const values = (drawn: Field | undefined): number[] =>
  drawn?.readings.map((one) => Math.round(one.value * 100) / 100) ?? []

/* The clocks are the test's: a watcher it decides for, frames it runs, the
 * time it sets, and a change's progress it moves. */
type Seen = { callback: IntersectionObserverCallback }
let watchers: Seen[] = []
let frames: (() => void)[] = []
let now = 0
const real = {
  frame: globalThis.requestAnimationFrame,
  matchMedia: globalThis.matchMedia,
  now: performance.now.bind(performance),
  watcher: globalThis.IntersectionObserver,
}

const install = (): void => {
  watchers = []
  frames = []
  now = 1000
  performance.now = () => now
  globalThis.requestAnimationFrame = ((run: () => void) => frames.push(run)) as never
  globalThis.IntersectionObserver = class {
    readonly seen: Seen
    constructor(callback: IntersectionObserverCallback) {
      this.seen = { callback }
      watchers.push(this.seen)
    }
    observe(): void {}
    unobserve(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
    disconnect(): void {
      watchers = watchers.filter((one) => one !== this.seen)
    }
  } as never
}

const restore = (): void => {
  performance.now = real.now
  globalThis.requestAnimationFrame = real.frame
  globalThis.IntersectionObserver = real.watcher
  globalThis.matchMedia = real.matchMedia
  document.documentElement.removeAttribute('data-helix-motion')
}

/* Installed and put back by each test, never by `beforeEach` and
   `afterEach`: the browser harness runs a file's hooks around every test in
   the family, so a clock left to a hook stood in for the page's frames in
   every other spec, and each one waited on a frame that never came. */
const clocked = (name: string, body: () => Promise<void> | void): void => {
  test(name, async () => {
    install()
    try {
      await body()
    } finally {
      restore()
    }
  })
}

const sees = (on: boolean): void => {
  for (const one of [...watchers]) {
    one.callback([{ isIntersecting: on } as IntersectionObserverEntry], {} as never)
  }
}

/** Moves the time on by `by` milliseconds and runs the frames asked for. */
const tick = (by: number): void => {
  now += by
  for (const run of frames.splice(0)) {
    run()
  }
}

/** A plain element standing in for a Lit host, with a change clock the test drives. */
const host = (options: { duration?: string; grow?: boolean; growAgain?: boolean } = {}) => {
  const clock = { canceled: 0, finished: false, progress: 0 }
  const element = document.createElement('div') as HTMLDivElement &
    ReactiveControllerHost & { updates: number }
  element.updates = 0
  let controller: ReactiveController | undefined
  element.addController = (one: ReactiveController) => {
    controller = one
  }
  element.requestUpdate = () => {
    element.updates += 1
  }
  element.removeController = () => {}
  element.animate = (() => {
    clock.finished = false
    clock.progress = 0
    return {
      cancel: () => {
        clock.canceled += 1
      },
      effect: { getComputedTiming: () => ({ progress: clock.finished ? null : clock.progress }) },
      get playState() {
        return clock.finished ? 'finished' : 'running'
      },
    } as unknown as Animation
  }) as HTMLElement['animate']
  const motion = new ReadingsMotionController<Field>(element, {
    between,
    grow: () => options.grow ?? false,
    growAgain: () => options.growAgain ?? false,
    items: (one) => one.readings.map((reading) => ({ key: reading.name, step: reading.step })),
    timing: () => ({ duration: options.duration ?? '', easing: 'linear' }),
  })
  controller?.hostConnected?.()
  return { clock, element, motion }
}

describe('growing in', () => {
  clocked(
    'waits on the floor until the host is seen, then grows each step a little after the one before',
    () => {
      const { motion } = host({ grow: true })
      motion.follow(field(['a', 10], ['b', 10]), true)
      expect(values(motion.drawn)).toEqual([0, 0])
      tick(500)
      expect(values(motion.drawn)).toEqual([0, 0])
      sees(true)
      tick(300)
      const [first, second] = values(motion.drawn)
      expect(first).toBeGreaterThan(second as number)
      tick(2000)
      expect(motion.moving).toBe(false)
      expect(values(motion.drawn)).toEqual([10, 10])
    },
  )

  clocked('stands at its readings at once where the page has paused its motion', () => {
    document.documentElement.setAttribute('data-helix-motion', 'paused')
    const { motion } = host({ grow: true })
    motion.follow(field(['a', 10]), true)
    expect(motion.moving).toBe(false)
  })

  clocked('stands at its readings at once under reduced motion', () => {
    globalThis.matchMedia = ((query: string) => ({ matches: query.includes('reduce') })) as never
    const { motion } = host({ duration: '200ms', grow: true })
    motion.follow(field(['a', 10]), true)
    expect(motion.moving).toBe(false)
    motion.follow(field(['a', 20]), true)
    expect(motion.moving).toBe(false)
  })

  clocked('pausing the page mid-growth stands every item at its reading', async () => {
    const { motion } = host({ grow: true })
    motion.follow(field(['a', 10]), true)
    sees(true)
    tick(200)
    expect(motion.moving).toBe(true)
    document.documentElement.setAttribute('data-helix-motion', 'paused')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(motion.moving).toBe(false)
  })

  clocked('grows in again after leaving the view, under grow-again', () => {
    const { motion } = host({ grow: true, growAgain: true })
    motion.follow(field(['a', 10]), true)
    sees(true)
    tick(3000)
    expect(motion.moving).toBe(false)
    sees(false)
    expect(values(motion.drawn)).toEqual([0])
    sees(true)
    tick(3000)
    expect(values(motion.drawn)).toEqual([10])
  })

  clocked(
    'a later table grows the items it adds on the growth curve, with no timing for the rest',
    () => {
      const { motion } = host({ grow: true })
      motion.follow(field(['a', 10]), true)
      sees(true)
      tick(3000)
      motion.follow(field(['a', 20], ['b', 10]), true)
      /* `a` has no timing to move on, so it stands at its new reading. */
      expect(values(motion.drawn)).toEqual([20, 0])
      tick(400)
      expect(values(motion.drawn)[1]).toBeGreaterThan(0)
      tick(2000)
      expect(motion.moving).toBe(false)
    },
  )
})

describe('a change of readings', () => {
  clocked(
    'moves on the family timing: kept items to their new readings, added ones from the floor, dropped ones to it',
    () => {
      const { clock, motion } = host({ duration: '200ms' })
      motion.follow(field(['a', 10], ['b', 10]), true)
      expect(motion.moving).toBe(false)
      motion.follow(field(['a', 20], ['c', 10]), true)
      expect(values(motion.drawn)).toEqual([10, 0, 10])
      clock.progress = 0.5
      tick(16)
      expect(values(motion.drawn)).toEqual([15, 5, 5])
      clock.finished = true
      tick(16)
      expect(motion.moving).toBe(false)
      expect(values(motion.drawn)).toEqual([20, 10])
    },
  )

  clocked('draws a new table at once with no timing, as on the headless tier', () => {
    const { motion } = host()
    motion.follow(field(['a', 10]), true)
    motion.follow(field(['a', 20]), true)
    expect(motion.moving).toBe(false)
    expect(values(motion.drawn)).toEqual([20])
  })

  clocked('a change mid-move starts from what is drawn', () => {
    const { clock, motion } = host({ duration: '200ms' })
    motion.follow(field(['a', 0]), true)
    motion.follow(field(['a', 100]), true)
    clock.progress = 0.4
    tick(16)
    motion.follow(field(['a', 0]), true)
    expect(clock.canceled).toBeGreaterThan(0)
    expect(values(motion.drawn)).toEqual([40])
    clock.progress = 0.5
    tick(16)
    expect(values(motion.drawn)).toEqual([20])
  })

  clocked('the first table with readings arrives whole, with nothing to move from', () => {
    const { motion } = host({ duration: '200ms' })
    motion.follow(field(), false)
    motion.follow(field(['a', 10]), true)
    expect(motion.moving).toBe(false)
  })
})
