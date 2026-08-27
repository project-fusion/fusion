import { describe, expect, test } from 'bun:test'
import { subscribe } from './ticker.js'

/**
 * One timer for the page, and the unsubscribe that keeps it that way.
 *
 * **The leak is the fault worth testing.** A notification panel is the thing a
 * reader opens and closes repeatedly, and a subscription that outlives its
 * element holds a closure over that element for the life of the page: nothing
 * fails, nothing is visibly wrong, and the tab grows.
 */

const soon = (ms: number) => new Promise((done) => setTimeout(done, ms))

describe('subscribe', () => {
  test('it runs the callback once the wait is up', async () => {
    let ran = 0
    subscribe(1000, () => {
      ran += 1
    })
    await soon(1200)
    expect(ran).toBe(1)
  })

  test('unsubscribing before the wait is up runs nothing', async () => {
    let ran = 0
    const stop = subscribe(1000, () => {
      ran += 1
    })
    stop()
    await soon(1200)
    expect(ran).toBe(0)
  })

  /**
   * The soonest wins, so a feed holding one fresh item and forty old ones still
   * updates the fresh one on time. Scheduled on anything but the minimum, the
   * item that needed the update is the one that does not get it.
   */
  test('the soonest subscriber decides when the timer fires', async () => {
    const ran: string[] = []
    subscribe(60_000, () => ran.push('late'))
    subscribe(1000, () => ran.push('soon'))
    await soon(1200)
    expect(ran).toEqual(['soon'])
  })

  test('a subscriber that re-subscribes from its own callback does not run twice', async () => {
    let ran = 0
    const again = (): void => {
      ran += 1
      if (ran < 2) {
        subscribe(1000, again)
      }
    }
    subscribe(1000, again)
    await soon(1400)
    expect(ran).toBe(1)
  })

  test('unsubscribing twice is not an error, since an element may disconnect twice', async () => {
    const stop = subscribe(1000, () => {})
    stop()
    expect(() => stop()).not.toThrow()
  })
})
