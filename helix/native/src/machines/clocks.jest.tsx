import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { useEffect } from 'react'
import { Text } from 'react-native'
import { useCountdown, useDelay, useWallClock } from './clocks'

const original = timers()
let clock: FakeTimers

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
})

describe('useDelay', () => {
  const Shown = ({ ms }: { ms: number }) => {
    const wait = useDelay()
    useEffect(() => wait.start(ms), [ms, wait])
    return <Text>{wait.elapsed ? 'shown' : 'waiting'}</Text>
  }

  test('draws again once its time has passed', async () => {
    await render(<Shown ms={300} />)
    expect(screen.getByText('waiting')).toBeTruthy()
    await act(() => clock.advance(300))
    expect(screen.getByText('shown')).toBeTruthy()
  })

  test('stops its wait as the component goes', async () => {
    const drawn = await render(<Shown ms={300} />)
    await drawn.unmount()
    expect(clock.pending().timeouts).toBe(0)
  })
})

describe('useCountdown', () => {
  test('runs out once its time is spent, held while the app is in the background', async () => {
    const spent: number[] = []
    const Message = () => {
      const timer = useCountdown({ done: () => spent.push(clock.now()), holdWhileHidden: true })
      useEffect(() => timer.start(1000), [timer])
      return null
    }
    const drawn = await render(<Message />)
    clock.advance(400)
    clock.setVisible(false)
    clock.advance(10_000)
    clock.setVisible(true)
    clock.advance(600)
    expect(spent).toEqual([11_000])
    await drawn.unmount()
    expect(clock.pending()).toEqual({ frames: 0, observers: 0, timeouts: 0 })
  })
})

describe('useWallClock', () => {
  const Minutes = () => {
    const now = useWallClock((at) => 60_000 - (at % 60_000))
    return <Text>{now === undefined ? 'none' : new Date(now).toISOString().slice(11, 16)}</Text>
  }

  test('draws the time of day, again each minute, and catches up as the app comes back', async () => {
    await render(<Minutes />)
    expect(screen.getByText('09:00')).toBeTruthy()
    await act(() => clock.advance(60_000))
    expect(screen.getByText('09:01')).toBeTruthy()
    await act(() => {
      clock.setVisible(false)
      clock.advance(60_000 * 10)
    })
    expect(screen.getByText('09:01')).toBeTruthy()
    await act(() => clock.setVisible(true))
    expect(screen.getByText('09:11')).toBeTruthy()
  })
})
