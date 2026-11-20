import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { runtimeLanguage } from '../../utils/locale-of/locale-of.js'
import { webLocale } from './web.js'

beforeAll(() => {
  registerDom()
})

/* The `lang` comes off the document element and the browser's own language
   goes back after each spec, so the files after this one read the page they
   expect. */
afterEach(() => {
  document.documentElement.removeAttribute('lang')
  delete (navigator as { language?: string }).language
})

/** Sets the browser's own language, as a reader does in its settings. */
const browserLanguage = (tag: string): void => {
  Object.defineProperty(navigator, 'language', { configurable: true, value: tag })
}

const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0))

describe('webLocale', () => {
  test('reads the document’s `lang`', () => {
    document.documentElement.lang = 'de-CH'
    expect(webLocale.read()).toBe('de-CH')
  })

  test('reads `navigator.language` where the document has no `lang`, or an empty one', () => {
    browserLanguage('fr-CA')
    expect(webLocale.read()).toBe('fr-CA')
    document.documentElement.lang = ''
    expect(webLocale.read()).toBe('fr-CA')
  })

  test('reads `navigator.language` where the `lang` is no tag `Intl` takes', () => {
    browserLanguage('fr-CA')
    document.documentElement.lang = 'not a tag'
    expect(webLocale.read()).toBe('fr-CA')
  })

  /* `lang="en"` says English, and a reader set to British English reads their
     own English better than the United States one `en` stands for. */
  test('reads the browser’s language for a bare language the browser already speaks', () => {
    const language = runtimeLanguage()
    browserLanguage(`${language}-NZ`)
    document.documentElement.lang = language
    expect(webLocale.read()).toBe(`${language}-NZ`)
  })

  test('calls an observer when the document’s `lang` changes', async () => {
    document.documentElement.lang = 'de-CH'
    const heard: string[] = []
    const stop = webLocale.observe((tag) => heard.push(tag))
    document.documentElement.lang = 'ja-JP'
    await settle()
    stop()
    expect(heard).toEqual(['ja-JP'])
  })

  test('calls an observer when the browser’s language changes', () => {
    browserLanguage('fr-CA')
    const heard: string[] = []
    const stop = webLocale.observe((tag) => heard.push(tag))
    browserLanguage('es-MX')
    window.dispatchEvent(new Event('languagechange'))
    stop()
    expect(heard).toEqual(['es-MX'])
  })

  test('calls no observer where the locale did not move', async () => {
    document.documentElement.lang = 'de-CH'
    const heard: string[] = []
    const stop = webLocale.observe((tag) => heard.push(tag))
    document.documentElement.lang = 'de-CH'
    window.dispatchEvent(new Event('languagechange'))
    await settle()
    stop()
    expect(heard).toEqual([])
  })

  test('stops listening to the `lang` and the browser’s language once stopped', async () => {
    const heard: string[] = []
    webLocale.observe((tag) => heard.push(tag))()
    document.documentElement.lang = 'ko-KR'
    browserLanguage('it-IT')
    window.dispatchEvent(new Event('languagechange'))
    await settle()
    expect(heard).toEqual([])
  })
})
