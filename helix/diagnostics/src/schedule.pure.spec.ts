import { describe, expect, test } from 'bun:test'
import { type Browser, schedule } from './schedule.js'

/** Small numbers, so the spec waits milliseconds where a page waits seconds. */
const timing = { factor: 2, gap: 40, idle: 5, longest: 100, quiet: 20 }

/** A run that counts itself and takes no time. */
let runs = 0
const count = (): number => {
  runs += 1
  return 0
}

/** Waits `ms` milliseconds. */
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms))

/** Waits until `done` holds, looking every 5 ms, for two seconds at most. */
const until = async (done: () => boolean) => {
  const end = performance.now() + 2000
  while (!done() && performance.now() < end) {
    await pause(5)
  }
}

/** A pretend tab, hidden or shown on command. */
const tab = () => {
  let hidden = false
  const waiting = new Set<() => void>()
  const on: Browser = {
    hidden: () => hidden,
    idle: (then) => {
      const id = setTimeout(then, 1)
      return () => clearTimeout(id)
    },
    now: () => performance.now(),
    shown: (then) => {
      waiting.add(then)
      return () => waiting.delete(then)
    },
  }
  return {
    hide: () => {
      hidden = true
    },
    on,
    show: () => {
      hidden = false
      for (const then of [...waiting]) {
        waiting.delete(then)
        then()
      }
    },
  }
}

describe('the schedule', () => {
  /* A quiet wait sixteen times the time between changes, and a longest wait
     well past the burst, because a busy runner fires a 5 ms timer late: at a
     quiet of 20, one late timer was a pause long enough to run in. */
  test('changes in a burst are one run, once they stop', async () => {
    runs = 0
    const plan = schedule(count, { ...timing, longest: 2000, quiet: 80 }, tab().on)
    for (let at = 0; at < 10; at += 1) {
      plan.poke()
      await pause(5)
    }
    expect(runs).toBe(0)
    await pause(200)
    expect(runs).toBe(1)
    plan.stop()
  })

  test('nothing runs when nothing changed', async () => {
    runs = 0
    const plan = schedule(count, timing, tab().on)
    await pause(80)
    expect(runs).toBe(0)
    plan.stop()
  })

  /* Here and in the next spec, the second change waits for the first run to
     happen. A busy runner fired the quiet timer late enough that a second
     change made after a set pause came before the first run, joined its
     burst, and the two ran as one. */
  test('a change soon after a run waits out the gap', async () => {
    const times: number[] = []
    const plan = schedule(
      () => {
        times.push(performance.now())
        return 0
      },
      timing,
      tab().on,
    )
    plan.poke()
    await until(() => times.length === 1)
    plan.poke()
    await until(() => times.length === 2)
    expect(times).toHaveLength(2)
    expect((times[1] ?? 0) - (times[0] ?? 0)).toBeGreaterThanOrEqual(timing.gap)
    plan.stop()
  })

  test('a slow run spaces the next by its duration times the factor', async () => {
    const times: number[] = []
    const plan = schedule(
      () => {
        times.push(performance.now())
        return 60
      },
      timing,
      tab().on,
    )
    plan.poke()
    await until(() => times.length === 1)
    plan.poke()
    await until(() => times.length === 2)
    expect(times).toHaveLength(2)
    expect((times[1] ?? 0) - (times[0] ?? 0)).toBeGreaterThanOrEqual(120)
    plan.stop()
  })

  test('a hidden tab runs nothing until it is shown', async () => {
    runs = 0
    const pretend = tab()
    const plan = schedule(count, timing, pretend.on)
    pretend.hide()
    plan.poke()
    await pause(80)
    expect(runs).toBe(0)
    pretend.show()
    await pause(60)
    expect(runs).toBe(1)
    plan.stop()
  })

  test('a page that never stops changing is still judged, by the longest wait', async () => {
    runs = 0
    const plan = schedule(count, timing, tab().on)
    for (let at = 0; at < 30; at += 1) {
      plan.poke()
      await pause(8)
    }
    expect(runs).toBeGreaterThanOrEqual(1)
    plan.stop()
  })

  test('nothing runs after it is stopped', async () => {
    runs = 0
    const plan = schedule(count, timing, tab().on)
    plan.poke()
    plan.stop()
    await pause(80)
    expect(runs).toBe(0)
  })
})
