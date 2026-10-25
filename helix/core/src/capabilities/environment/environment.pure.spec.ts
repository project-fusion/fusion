import { afterEach, describe, expect, test } from 'bun:test'
import type { Conditions } from '../types.generated.js'
import { fakeEnvironment } from './fake.js'
import { environment, setEnvironment } from './index.js'
import { serverEnvironment, serverEnvironmentFrom } from './server.js'

afterEach(() => {
  setEnvironment(serverEnvironment)
})

describe('environment', () => {
  test('is the server implementation until one is set', () => {
    expect(environment()).toBe(serverEnvironment)
  })

  test('calls the implementation set last', () => {
    const fake = fakeEnvironment({ colorScheme: 'dark' })
    setEnvironment(fake)
    expect(environment().read().colorScheme).toBe('dark')
    expect(fake.asked).toEqual(['read'])
  })
})

describe('serverEnvironment', () => {
  test('reads a light, left-to-right page at a font scale of 1, on the server, with motion', () => {
    expect(serverEnvironment.read()).toEqual({
      colorScheme: 'light',
      direction: 'ltr',
      fontScale: 1,
      insets: { bottom: 0, left: 0, right: 0, top: 0 },
      platform: 'server',
      reducedMotion: false,
      screenReader: false,
      window: { height: 0, width: 0 },
    })
  })

  test('reads what the request states, over the rest', () => {
    const request = serverEnvironmentFrom({ direction: 'rtl', reducedMotion: true })
    expect(request.read()).toEqual({
      colorScheme: 'light',
      direction: 'rtl',
      fontScale: 1,
      insets: { bottom: 0, left: 0, right: 0, top: 0 },
      platform: 'server',
      reducedMotion: true,
      screenReader: false,
      window: { height: 0, width: 0 },
    })
  })

  test('hands each read its own copy', () => {
    const first = serverEnvironment.read()
    first.colorScheme = 'dark'
    expect(serverEnvironment.read().colorScheme).toBe('light')
  })

  test('calls no observer, and stops without throwing', () => {
    const heard: Conditions[] = []
    const stop = serverEnvironment.observe((conditions) => heard.push(conditions))
    expect(stop()).toBeUndefined()
    expect(heard).toEqual([])
  })
})

describe('fakeEnvironment', () => {
  test('starts with the server’s conditions, and any it is given', () => {
    expect(fakeEnvironment().read()).toEqual(serverEnvironment.read())
    expect(fakeEnvironment({ platform: 'ios' }).read().platform).toBe('ios')
  })

  test('calls each observer with the conditions after a change', () => {
    const fake = fakeEnvironment()
    const heard: Conditions[] = []
    fake.observe((conditions) => heard.push(conditions))
    fake.change({ colorScheme: 'dark', fontScale: 1.5 })
    expect(heard).toEqual([{ ...serverEnvironment.read(), colorScheme: 'dark', fontScale: 1.5 }])
    expect(fake.read().fontScale).toBe(1.5)
  })

  test('calls no observer where nothing moved', () => {
    const fake = fakeEnvironment({ direction: 'rtl' })
    const heard: Conditions[] = []
    fake.observe((conditions) => heard.push(conditions))
    fake.change({ direction: 'rtl' })
    expect(heard).toEqual([])
  })

  test('compares a window size and a safe area by their fields', () => {
    const fake = fakeEnvironment({ window: { height: 800, width: 400 } })
    const heard: Conditions[] = []
    fake.observe((conditions) => heard.push(conditions))
    fake.change({ window: { height: 800, width: 400 } })
    expect(heard).toEqual([])
    fake.change({ insets: { bottom: 34, left: 0, right: 0, top: 59 }, screenReader: true })
    expect(heard.map(({ insets, screenReader }) => ({ insets, screenReader }))).toEqual([
      { insets: { bottom: 34, left: 0, right: 0, top: 59 }, screenReader: true },
    ])
  })

  test('stops calling an observer once it is stopped', () => {
    const fake = fakeEnvironment()
    const heard: Conditions[] = []
    const stop = fake.observe((conditions) => heard.push(conditions))
    expect(fake.listening).toBe(1)
    stop()
    expect(fake.listening).toBe(0)
    fake.change({ reducedMotion: true })
    expect(heard).toEqual([])
  })

  test('keeps each request in the order it was made', () => {
    const fake = fakeEnvironment()
    const stop = fake.observe(() => undefined)
    fake.read()
    stop()
    expect(fake.asked).toEqual(['observe', 'read', 'stop'])
  })
})
