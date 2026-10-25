import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { AppState } from 'react-native'
import { nativeTimers } from './timers'

/** The `performance` React Native's Jest preset installs, whose types React Native leaves out. */
declare const performance: { now: () => number }

/**
 * The preset's `currentState`, put back after each spec. React Native's Jest
 * preset makes it a mock function, where a device's is a string, and
 * `replaceProperty` refuses a function, so the spec sets it by hand.
 */
const presetState = AppState.currentState

const appIn = (state: string): void => {
  AppState.currentState = state
}

/** Keeps the handler `AppState`'s change is given, so a spec can play a change. */
const listen = () => {
  const remove = jest.fn()
  let handler: (state: string) => void = () => undefined
  jest.spyOn(AppState, 'addEventListener').mockImplementationOnce((_type, given) => {
    handler = given as (state: string) => void
    return { remove }
  })
  return {
    change: (state: string) => {
      appIn(state)
      handler(state)
    },
    remove,
  }
}

afterEach(() => {
  AppState.currentState = presetState
  jest.useRealTimers()
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeTimers', () => {
  test('reads the clock from performance.now()', () => {
    jest.spyOn(performance, 'now').mockReturnValueOnce(1234.5)
    expect(nativeTimers.now()).toBe(1234.5)
  })

  test('calls a timeout once its time has passed', () => {
    jest.useFakeTimers()
    const done = jest.fn()
    nativeTimers.timeout(100, done)
    jest.advanceTimersByTime(99)
    expect(done).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(done).toHaveBeenCalledTimes(1)
  })

  test('calls no timeout that was stopped', () => {
    jest.useFakeTimers()
    const done = jest.fn()
    const stop = nativeTimers.timeout(100, done)
    stop()
    jest.advanceTimersByTime(100)
    expect(done).not.toHaveBeenCalled()
  })

  test('calls a frame with its time, and no frame that was stopped', () => {
    jest.useFakeTimers()
    const drawn = jest.fn()
    const skipped = jest.fn()
    nativeTimers.frame(drawn)
    nativeTimers.frame(skipped)()
    jest.advanceTimersByTime(16)
    expect(drawn).toHaveBeenCalledTimes(1)
    expect(drawn).toHaveBeenCalledWith(expect.any(Number))
    expect(skipped).not.toHaveBeenCalled()
  })

  test('counts the app in front unless it is in the background', () => {
    appIn('active')
    expect(nativeTimers.visible()).toBe(true)
    appIn('inactive')
    expect(nativeTimers.visible()).toBe(true)
    appIn('background')
    expect(nativeTimers.visible()).toBe(false)
  })

  test('tells an observer when the app leaves the front and comes back, until stopped', () => {
    appIn('active')
    const app = listen()
    const told: boolean[] = []
    const stop = nativeTimers.observeVisible((visible) => told.push(visible))
    app.change('inactive')
    app.change('background')
    app.change('active')
    expect(told).toEqual([false, true])
    stop()
    expect(app.remove).toHaveBeenCalledTimes(1)
  })
})
