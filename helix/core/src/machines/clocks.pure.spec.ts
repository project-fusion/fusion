import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { FAKE_WALL_START, type FakeTimers, fakeTimers } from '../capabilities/timers/fake.js'
import { setTimers, timers } from '../capabilities/timers/index.js'
import { countdown, delay } from './countdown.js'
import { wallClock } from './wall-clock.js'

const original = timers()
const HOUR = 3_600_000
let clock: FakeTimers

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
})

describe('delay', () => {
  test('runs once its time has passed, and says it has elapsed', () => {
    const turns: boolean[] = []
    const wait = delay((elapsed) => turns.push(elapsed))
    let done = 0
    wait.start(100, () => {
      done += 1
    })
    clock.advance(99)
    expect([done, wait.pending, wait.elapsed]).toEqual([0, true, false])
    clock.advance(1)
    expect([done, wait.pending, wait.elapsed]).toEqual([1, false, true])
    expect(turns).toEqual([true])
  })

  test('starts over when started again, and forgets itself when canceled', () => {
    const wait = delay()
    let done = 0
    wait.start(100, () => {
      done += 1
    })
    clock.advance(60)
    wait.start(100, () => {
      done += 1
    })
    clock.advance(60)
    expect(done).toBe(0)
    wait.cancel()
    clock.advance(100)
    expect([done, wait.pending]).toEqual([0, false])
  })

  test('ends at once when flushed', () => {
    const wait = delay()
    let done = 0
    wait.start(100, () => {
      done += 1
    })
    wait.flush()
    expect([done, wait.elapsed, clock.pending().timeouts]).toEqual([1, true, 0])
  })
})

describe('countdown', () => {
  test('runs out once its time is spent, and keeps what is left while held', () => {
    let done = 0
    const paused: boolean[] = []
    const timer = countdown({
      done: () => {
        done += 1
      },
      paused: (now) => paused.push(now),
    })
    timer.start(1000)
    clock.advance(400)
    timer.hold()
    clock.advance(5000)
    expect([done, timer.running]).toEqual([0, false])
    timer.release()
    clock.advance(599)
    expect(done).toBe(0)
    clock.advance(1)
    expect(done).toBe(1)
    expect(paused).toEqual([false, true, false])
  })

  test('counts its holds, and runs again only when the last one is released', () => {
    const timer = countdown({ done: () => undefined })
    timer.start(1000)
    timer.hold()
    timer.hold()
    timer.release()
    expect(timer.running).toBe(false)
    timer.release()
    expect(timer.running).toBe(true)
  })

  test('holds while the app is away where asked, as one hold however often it goes', () => {
    let done = 0
    const timer = countdown({
      done: () => {
        done += 1
      },
      holdWhileHidden: true,
    })
    timer.start(1000)
    clock.advance(500)
    clock.setVisible(false)
    clock.setVisible(false)
    clock.advance(5000)
    expect(done).toBe(0)
    timer.hold()
    clock.setVisible(true)
    expect(timer.running).toBe(false)
    timer.release()
    clock.advance(500)
    expect(done).toBe(1)
  })

  test('waits for the app to come back where started while it is away', () => {
    clock.setVisible(false)
    const timer = countdown({ done: () => undefined, holdWhileHidden: true })
    timer.start(1000)
    expect(timer.running).toBe(false)
    clock.setVisible(true)
    expect(timer.running).toBe(true)
  })

  test('starts nothing for no time, and resumes nothing once spent or canceled', () => {
    let done = 0
    const timer = countdown({
      done: () => {
        done += 1
      },
    })
    timer.start(0)
    expect(timer.running).toBe(false)
    timer.start(100)
    timer.cancel()
    timer.resume()
    clock.advance(200)
    expect(done).toBe(0)
  })

  test('stops listening and drops its holds once disposed', () => {
    const timer = countdown({ done: () => undefined, holdWhileHidden: true })
    expect(clock.pending().observers).toBe(1)
    timer.start(1000)
    timer.hold()
    timer.dispose()
    expect(clock.pending()).toEqual({ frames: 0, observers: 0, timeouts: 0 })
    timer.resume()
    expect(timer.running).toBe(true)
  })
})

describe('wallClock', () => {
  /** A clock that changes what it draws each minute. */
  const minutes = (ticks: number[]) =>
    wallClock({
      expires: (now) => 60_000 - (now % 60_000),
      tick: (now) => ticks.push(now),
    })

  test('ticks at once, then each time what it draws changes', () => {
    const ticks: number[] = []
    const start = clock.wall()
    const stop = minutes(ticks)
    clock.advance(60_000 * 2)
    expect(ticks).toEqual([start, start + 60_000, start + 120_000])
    stop()
    clock.advance(60_000)
    expect(ticks).toHaveLength(3)
  })

  test('stops while the app is away, and catches up as it comes back', () => {
    const ticks: number[] = []
    const start = clock.wall()
    const stop = minutes(ticks)
    clock.setVisible(false)
    clock.advance(60_000 * 5 + 30_000)
    expect(ticks).toEqual([start])
    clock.setVisible(true)
    expect(ticks).toEqual([start, start + 330_000])
    clock.advance(30_000)
    expect(ticks.at(-1)).toBe(start + 360_000)
    stop()
  })

  test('hears a system clock set while the app was away', () => {
    const ticks: number[] = []
    const stop = minutes(ticks)
    clock.setVisible(false)
    clock.setWall(FAKE_WALL_START - HOUR)
    clock.setVisible(true)
    expect(ticks.at(-1)).toBe(FAKE_WALL_START - HOUR)
    stop()
  })

  test('stops where `expires` says nothing more changes', () => {
    const ticks: number[] = []
    const stop = wallClock({ expires: () => undefined, tick: (now) => ticks.push(now) })
    expect([ticks, clock.pending().timeouts]).toEqual([[], 0])
    stop()
  })
})
