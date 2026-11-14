/*
 * A finger at rest near an edge keeps a list scrolling, frame after frame, with
 * no move of the finger.
 */
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { edgeFollow } from './edge-follow'

describe('edgeFollow', () => {
  const before = timers()
  let clock: ReturnType<typeof fakeTimers>

  beforeEach(() => {
    clock = fakeTimers()
    setTimers(clock)
  })

  afterEach(() => {
    setTimers(before)
  })

  test('keeps stepping each frame while the step answers true, with no new move', () => {
    const edge = edgeFollow()
    let steps = 0
    edge.follow(() => {
      steps += 1
      return true
    })
    expect(steps).toBe(1)
    clock.runFrame()
    clock.runFrame()
    clock.runFrame()
    expect(steps).toBeGreaterThanOrEqual(3)
    edge.stop()
  })

  test('rests once the step answers false, and a later move starts it again', () => {
    const edge = edgeFollow()
    let steps = 0
    edge.follow(() => {
      steps += 1
      return false
    })
    clock.runFrame()
    expect(steps).toBe(1)
    edge.follow(() => {
      steps += 1
      return false
    })
    expect(steps).toBe(2)
  })

  test('stops as the finger lifts', () => {
    const edge = edgeFollow()
    let steps = 0
    edge.follow(() => {
      steps += 1
      return true
    })
    edge.stop()
    clock.runFrame()
    expect(steps).toBe(1)
  })
})
