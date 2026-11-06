import { afterEach, describe, expect, test } from 'bun:test'
import { fakeLocale } from './fake.js'
import { locale, setLocale } from './index.js'
import { serverLocale, serverLocaleFrom } from './server.js'

afterEach(() => {
  setLocale(serverLocale)
})

describe('locale', () => {
  test('is the server implementation until one is set', () => {
    expect(locale()).toBe(serverLocale)
  })

  test('calls the implementation set last', () => {
    const fake = fakeLocale('de-CH')
    setLocale(fake)
    expect(locale().read()).toBe('de-CH')
    expect(fake.asked).toEqual(['read'])
  })
})

describe('serverLocale', () => {
  test('reads `en-US` where the request states no locale', () => {
    expect(serverLocale.read()).toBe('en-US')
    expect(serverLocaleFrom('').read()).toBe('en-US')
  })

  test('reads the locale the request states', () => {
    expect(serverLocaleFrom('pt-BR').read()).toBe('pt-BR')
  })

  test('calls no observer, and stops without throwing', () => {
    const heard: string[] = []
    const stop = serverLocale.observe((tag) => heard.push(tag))
    expect(stop()).toBeUndefined()
    expect(heard).toEqual([])
  })
})

describe('fakeLocale', () => {
  test('starts at `en-US`, or the locale it is given', () => {
    expect(fakeLocale().read()).toBe('en-US')
    expect(fakeLocale('ja-JP').read()).toBe('ja-JP')
  })

  test('calls each observer with the locale after a change, and none where it did not move', () => {
    const fake = fakeLocale()
    const heard: string[] = []
    fake.observe((tag) => heard.push(tag))
    fake.change('fr-CA')
    fake.change('fr-CA')
    expect(heard).toEqual(['fr-CA'])
    expect(fake.read()).toBe('fr-CA')
  })

  test('stops calling an observer once it is stopped', () => {
    const fake = fakeLocale()
    const heard: string[] = []
    const stop = fake.observe((tag) => heard.push(tag))
    expect(fake.listening).toBe(1)
    stop()
    expect(fake.listening).toBe(0)
    fake.change('ar-EG')
    expect(heard).toEqual([])
  })

  test('keeps each request in the order it was made', () => {
    const fake = fakeLocale()
    const stop = fake.observe(() => undefined)
    fake.read()
    stop()
    expect(fake.asked).toEqual(['observe', 'read', 'stop'])
  })
})
