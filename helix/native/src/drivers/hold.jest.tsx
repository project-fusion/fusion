import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { act, render } from '@testing-library/react-native'
import { useEffect } from 'react'
import { type Hold, holdToRepeat, useHold } from './hold'

/* A held press on the timers capability's fake clock: once at the press,
   again after 400 milliseconds, every 60 after that, and never once let go
   or at an end. */

let clock: FakeTimers
let before: ReturnType<typeof timers>

beforeEach(() => {
  before = timers()
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(before)
})

/** A count that steps up to `most`, and says whether each step moved it. */
const counter = (most = Number.POSITIVE_INFINITY) => {
  const held = { count: 0 }
  const step = (): boolean => {
    if (held.count >= most) {
      return false
    }
    held.count += 1
    return true
  }
  return { held, step }
}

test('steps once at the press, again after the delay, and at each interval after that', () => {
  const { held, step } = counter()
  const hold = holdToRepeat(step)
  hold.start()
  expect(held.count).toBe(1)
  clock.advance(399)
  expect(held.count).toBe(1)
  clock.advance(1)
  expect(held.count).toBe(2)
  clock.advance(60 * 3)
  expect(held.count).toBe(5)
  expect(clock.asked.slice(0, 3)).toEqual([400, 60, 60])
})

test('letting go stops it, and nothing waits after', () => {
  const { held, step } = counter()
  const hold = holdToRepeat(step)
  hold.start()
  clock.advance(460)
  expect(held.count).toBe(3)
  hold.stop()
  clock.advance(1000)
  expect(held.count).toBe(3)
  expect(clock.pending().timeouts).toBe(0)
})

test('a step that moves nothing ends the hold, as a number at its end does', () => {
  const { held, step } = counter(2)
  const hold = holdToRepeat(step)
  hold.start()
  clock.advance(400)
  expect(held.count).toBe(2)
  clock.advance(60)
  expect(held.count).toBe(2)
  expect(clock.pending().timeouts).toBe(0)
})

test('a press that moves nothing at once waits for nothing', () => {
  const { held, step } = counter(0)
  holdToRepeat(step).start()
  expect(held.count).toBe(0)
  expect(clock.pending().timeouts).toBe(0)
})

test('a hold kept by a view reads its latest step and stops as the view goes', async () => {
  const { held, step } = counter()
  let hold: Hold | undefined
  const Holder = ({ by }: { readonly by: number }) => {
    const kept = useHold(() => {
      held.count += by - 1
      return step()
    })
    useEffect(() => {
      hold = kept
    }, [kept])
    return null
  }
  const drawn = await render(<Holder by={1} />)
  await act(() => hold?.start())
  expect(held.count).toBe(1)
  await drawn.rerender(<Holder by={2} />)
  await act(() => clock.advance(400))
  expect(held.count).toBe(3)
  await drawn.unmount()
  await act(() => clock.advance(1000))
  expect(held.count).toBe(3)
})
