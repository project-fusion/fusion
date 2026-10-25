import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { AppState } from 'react-native'
import { nativeLocale } from './locale'

/** Makes `Intl.DateTimeFormat` resolve to `locale`, as the system's setting does. */
const systemLocale = (locale: string): void => {
  jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...new Intl.DateTimeFormat('en-US').resolvedOptions(),
    locale,
  })
}

/** Keeps the handler `AppState`'s change is given, so a spec can play a change. */
const listen = () => {
  const remove = jest.fn()
  let handler: (state: string) => void = () => undefined
  jest.spyOn(AppState, 'addEventListener').mockImplementationOnce((_type, given) => {
    handler = given as (state: string) => void
    return { remove }
  })
  return { change: (state: string) => handler(state), remove }
}

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeLocale', () => {
  test('reads the locale Intl formats in', () => {
    systemLocale('fr-CA')
    expect(nativeLocale.read()).toBe('fr-CA')
  })

  test('reads again when the app comes back to the front, and tells an observer the new locale', () => {
    systemLocale('en-US')
    const app = listen()
    const told: string[] = []
    const stop = nativeLocale.observe((locale) => told.push(locale))
    systemLocale('de-DE')
    app.change('background')
    expect(told).toEqual([])
    app.change('active')
    expect(told).toEqual(['de-DE'])
    stop()
    expect(app.remove).toHaveBeenCalledTimes(1)
  })

  test('calls nothing where the app comes back with the locale it had', () => {
    systemLocale('en-US')
    const app = listen()
    const told: string[] = []
    const stop = nativeLocale.observe((locale) => told.push(locale))
    app.change('active')
    expect(told).toEqual([])
    stop()
  })
})
