import { afterEach, describe, expect, jest, test } from '@jest/globals'
import {
  AccessibilityInfo,
  Appearance,
  Dimensions,
  I18nManager,
  PixelRatio,
  Platform,
} from 'react-native'
import { askReducedMotion, askScreenReader, hearInsets, nativeEnvironment } from './environment'

type Conditions = ReturnType<typeof nativeEnvironment.read>

/** A question that is never answered. */
const unanswered = (): Promise<boolean> => new Promise(() => undefined)

/**
 * Asks about reduced motion with `answer` as the system's answer, and keeps
 * the handler `reduceMotionChanged` is given so a spec can play a change.
 */
const ask = (answer: Promise<boolean>) => {
  const remove = jest.fn()
  let handler: (reduced: boolean) => void = () => undefined
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementationOnce((_event, heard) => {
    handler = heard as (reduced: boolean) => void
    return { remove }
  })
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValueOnce(answer)
  const stop = askReducedMotion()
  return { change: (reduced: boolean) => handler(reduced), remove, stop }
}

/** Keeps the listener `listen` is given, and plays it on `fire`. */
const heard = () => {
  const remove = jest.fn()
  let listener: () => void = () => undefined
  return {
    fire: () => listener(),
    keep: (given: unknown) => {
      listener = given as () => void
      return { remove }
    },
    remove,
  }
}

afterEach(() => {
  ask(unanswered()).change(false)
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeEnvironment', () => {
  test('reads each condition from React Native', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark')
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1.5)
    jest.replaceProperty(I18nManager, 'isRTL', true)
    jest.replaceProperty(Platform, 'OS', 'android' as typeof Platform.OS)
    jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ fontScale: 1.5, height: 800, scale: 2, width: 400 })
    expect(nativeEnvironment.read()).toEqual({
      colorScheme: 'dark',
      direction: 'rtl',
      fontScale: 1.5,
      insets: { bottom: 0, left: 0, right: 0, top: 0 },
      platform: 'android',
      reducedMotion: false,
      screenReader: false,
      window: { height: 800, width: 400 },
    })
  })

  test('reads light where Appearance has no color scheme, and iOS where the platform is not Android', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(null)
    jest.replaceProperty(Platform, 'OS', 'macos' as typeof Platform.OS)
    expect(nativeEnvironment.read()).toMatchObject({ colorScheme: 'light', platform: 'ios' })
  })

  test('reads reduced motion from the answer to the question asked at install', async () => {
    const answer = Promise.resolve(true)
    const asked = ask(answer)
    expect(nativeEnvironment.read().reducedMotion).toBe(false)
    await answer
    expect(nativeEnvironment.read().reducedMotion).toBe(true)
    asked.stop()
    expect(asked.remove).toHaveBeenCalledTimes(1)
  })

  test('keeps a change heard before the answer arrives', async () => {
    let reply: (reduced: boolean) => void = () => undefined
    const answer = new Promise<boolean>((resolve) => {
      reply = resolve
    })
    const asked = ask(answer)
    asked.change(true)
    reply(false)
    await answer
    expect(nativeEnvironment.read().reducedMotion).toBe(true)
    asked.stop()
  })

  test('tells an observer each reduced-motion change, with every condition, until stopped', () => {
    const asked = ask(unanswered())
    const told: Conditions[] = []
    const stop = nativeEnvironment.observe((conditions) => told.push(conditions))
    asked.change(true)
    expect(told).toEqual([{ ...nativeEnvironment.read(), reducedMotion: true }])
    stop()
    asked.change(false)
    expect(told).toHaveLength(1)
    asked.stop()
  })

  test('reads the screen reader from the answer to its question, and tells each change', async () => {
    let changed: (on: boolean) => void = () => undefined
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementationOnce((event, handler) => {
      expect(event).toBe('screenReaderChanged')
      changed = handler as (on: boolean) => void
      return { remove: jest.fn() }
    })
    const answer = Promise.resolve(true)
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockReturnValueOnce(answer)
    const stop = askScreenReader()
    await answer
    expect(nativeEnvironment.read().screenReader).toBe(true)
    const told: Conditions[] = []
    const stopObserving = nativeEnvironment.observe((conditions) => told.push(conditions))
    changed(false)
    expect(told.map((conditions) => conditions.screenReader)).toEqual([false])
    stopObserving()
    stop()
  })

  test('tells an observer the safe area it hears, and nothing for the same one again', () => {
    const told: Conditions[] = []
    const stop = nativeEnvironment.observe((conditions) => told.push(conditions))
    hearInsets({ bottom: 34, left: 0, right: 0, top: 59 })
    hearInsets({ bottom: 34, left: 0, right: 0, top: 59 })
    expect(told.map((conditions) => conditions.insets)).toEqual([
      { bottom: 34, left: 0, right: 0, top: 59 },
    ])
    stop()
    hearInsets({ bottom: 0, left: 0, right: 0, top: 0 })
  })

  test('hears a new window size from Dimensions', () => {
    const dimensions = heard()
    jest.spyOn(Dimensions, 'addEventListener').mockImplementation((_type, handler) => {
      return dimensions.keep(handler)
    })
    const window = jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ fontScale: 1, height: 800, scale: 2, width: 400 })
    const told: Conditions[] = []
    const stop = nativeEnvironment.observe((conditions) => told.push(conditions))
    window.mockReturnValue({ fontScale: 1, height: 400, scale: 2, width: 800 })
    dimensions.fire()
    expect(told.map((conditions) => conditions.window)).toEqual([{ height: 400, width: 800 }])
    stop()
  })

  test('hears a change of color scheme from Appearance', () => {
    const appearance = heard()
    jest.spyOn(Appearance, 'addChangeListener').mockImplementation(appearance.keep)
    const scheme = jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light')
    const told: Conditions[] = []
    const stop = nativeEnvironment.observe((conditions) => told.push(conditions))
    scheme.mockReturnValue('dark')
    appearance.fire()
    expect(told.map((conditions) => conditions.colorScheme)).toEqual(['dark'])
    stop()
    expect(appearance.remove).toHaveBeenCalledTimes(1)
  })

  test('hears a new text size from Dimensions', () => {
    const dimensions = heard()
    jest.spyOn(Dimensions, 'addEventListener').mockImplementation((_type, handler) => {
      return dimensions.keep(handler)
    })
    const scale = jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1)
    const told: Conditions[] = []
    const stop = nativeEnvironment.observe((conditions) => told.push(conditions))
    scale.mockReturnValue(1.3)
    dimensions.fire()
    expect(told.map((conditions) => conditions.fontScale)).toEqual([1.3])
    stop()
    expect(dimensions.remove).toHaveBeenCalledTimes(1)
  })

  test('calls nothing where a change leaves what it reads the same', () => {
    const dimensions = heard()
    jest.spyOn(Dimensions, 'addEventListener').mockImplementation((_type, handler) => {
      return dimensions.keep(handler)
    })
    const told: Conditions[] = []
    const stop = nativeEnvironment.observe((conditions) => told.push(conditions))
    dimensions.fire()
    expect(told).toEqual([])
    stop()
  })
})
