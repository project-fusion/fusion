import { afterEach, describe, expect, test } from 'bun:test'
import {
  clearWords,
  defaultWordsLocale,
  localeChain,
  lookupWord,
  registerWords,
  setDefaultWordsLocale,
  watchWords,
  wordsRegistered,
} from './registry.js'

afterEach(() => {
  clearWords()
  setDefaultWordsLocale('en')
})

describe('the locales a word is looked for in', () => {
  test('go from the most specific to English, script before language', () => {
    expect(localeChain('de-CH')).toEqual(['de-ch', 'de-latn-ch', 'de-latn', 'de', 'en'])
    expect(localeChain('zh-HK')).toEqual(['zh-hk', 'zh-hant-hk', 'zh-hant', 'zh', 'en'])
    expect(localeChain('sr-Latn-RS')).toEqual(['sr-latn-rs', 'sr-latn', 'sr-rs', 'sr', 'en'])
    expect(localeChain('pt-PT')).toEqual(['pt-pt', 'pt-latn-pt', 'pt-latn', 'pt', 'en'])
  })

  test('drop Unicode extensions', () => {
    expect(localeChain('en-US-u-ca-buddhist')).toEqual(['en-us', 'en-latn-us', 'en-latn', 'en'])
  })

  test('fall straight to English for a tag `Intl` refuses', () => {
    expect(localeChain('xx-bad!')).toEqual(['en'])
  })
})

describe('a registered word', () => {
  test('is found for its locale and the locales that fall back to it', () => {
    registerWords('de', { 'helix-select': { placeholder: 'Wählen' } })
    expect(lookupWord('de', 'helix-select', 'placeholder')).toEqual(['Wählen', 'de'])
    expect(lookupWord('de-AT', 'helix-select', 'placeholder')).toEqual(['Wählen', 'de'])
    expect(lookupWord('fr', 'helix-select', 'placeholder')).toBeUndefined()
  })

  test('falls back one key at a time', () => {
    registerWords('de', { 'helix-dialog': { closeLabel: 'Schließen', title: 'Titel' } })
    registerWords('de-CH', { 'helix-dialog': { closeLabel: 'Schliessen' } })
    expect(lookupWord('de-CH', 'helix-dialog', 'closeLabel')).toEqual(['Schliessen', 'de-ch'])
    expect(lookupWord('de-CH', 'helix-dialog', 'title')).toEqual(['Titel', 'de'])
  })

  test('reaches Traditional Chinese from Hong Kong before plain Chinese', () => {
    registerWords('zh', { 'helix-dialog': { closeLabel: '关闭' } })
    registerWords('zh-Hant', { 'helix-dialog': { closeLabel: '關閉' } })
    expect(lookupWord('zh-HK', 'helix-dialog', 'closeLabel')).toEqual(['關閉', 'zh-hant'])
    expect(lookupWord('zh-CN', 'helix-dialog', 'closeLabel')).toEqual(['关闭', 'zh'])
  })

  test('registered for English rewords every locale with nothing nearer', () => {
    registerWords('en', { 'helix-dialog': { closeLabel: 'Dismiss' } })
    expect(lookupWord('ja', 'helix-dialog', 'closeLabel')).toEqual(['Dismiss', 'en'])
  })

  test('merges over the words registered before it', () => {
    registerWords('de', { 'helix-dialog': { closeLabel: 'Zu', title: 'Titel' } })
    registerWords('de', { 'helix-dialog': { closeLabel: 'Schließen' } })
    expect(lookupWord('de', 'helix-dialog', 'closeLabel')?.[0]).toBe('Schließen')
    expect(lookupWord('de', 'helix-dialog', 'title')?.[0]).toBe('Titel')
  })

  test('takes several families in one call', () => {
    registerWords('de', { 'helix-a': { label: 'A' } }, { 'helix-b': { label: 'B' } })
    expect(lookupWord('de', 'helix-b', 'label')?.[0]).toBe('B')
  })

  test('in a table merges entry by entry, along the chain too', () => {
    registerWords('de', { 'helix-meter': { bandLabels: { high: 'Hoch', low: 'Niedrig' } } })
    registerWords('de', { 'helix-meter': { bandLabels: { low: 'Tief' } } })
    registerWords('de-CH', { 'helix-meter': { bandLabels: { high: 'Höch' } } })
    expect(lookupWord('de-CH', 'helix-meter', 'bandLabels')).toEqual([
      { high: 'Höch', low: 'Tief' },
      'de-ch',
    ])
  })

  test('is gone once its locale is cleared', () => {
    registerWords('de', { 'helix-a': { label: 'A' } })
    registerWords('fr', { 'helix-a': { label: 'A' } })
    clearWords('DE')
    expect(lookupWord('de', 'helix-a', 'label')).toBeUndefined()
    expect(wordsRegistered()).toBe(true)
    clearWords()
    expect(wordsRegistered()).toBe(false)
  })
})

describe('the registry', () => {
  test('holds no current locale, only the default a server speaks', () => {
    expect(defaultWordsLocale()).toBe('en')
    setDefaultWordsLocale('de')
    expect(defaultWordsLocale()).toBe('de')
  })

  test('tells its watchers once per task, however many words arrive', async () => {
    let told = 0
    const stop = watchWords(() => {
      told += 1
    })
    registerWords('de', { 'helix-a': { label: 'A' } })
    registerWords('fr', { 'helix-a': { label: 'A' } })
    clearWords('fr')
    expect(told).toBe(0)
    await Promise.resolve()
    expect(told).toBe(1)
    stop()
    registerWords('it', { 'helix-a': { label: 'A' } })
    await Promise.resolve()
    expect(told).toBe(1)
  })
})
