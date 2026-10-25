import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { Conditions } from '../types.generated.js'
import { webEnvironment } from './web.js'

const REDUCE = '(prefers-reduced-motion: reduce)'
const DARK = '(prefers-color-scheme: dark)'

/** A media query whose answer a spec sets, with the listeners it was given. */
interface Query {
  matches: boolean
  readonly listeners: Set<() => void>
}

/* happy-dom's `matchMedia` cannot change what it reports, so each spec puts in
   one whose answers it sets, and the real one goes back after it. */
const queries = new Map<string, Query>()
let realMatchMedia: typeof globalThis.matchMedia

const query = (media: string): Query => {
  const found = queries.get(media) ?? { listeners: new Set(), matches: false }
  queries.set(media, found)
  return found
}

/** Sets what a media query matches, and fires its `change` as a browser does. */
const prefer = (media: string, matches: boolean): void => {
  const one = query(media)
  one.matches = matches
  for (const listener of [...one.listeners]) {
    listener()
  }
}

const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0))

beforeAll(() => {
  registerDom()
  realMatchMedia = globalThis.matchMedia
})

afterEach(() => {
  globalThis.matchMedia = realMatchMedia
  queries.clear()
  document.documentElement.removeAttribute('dir')
})

const stubMatchMedia = (): void => {
  globalThis.matchMedia = ((media: string) => {
    const one = query(media)
    return {
      addEventListener: (_: string, listener: () => void) => one.listeners.add(listener),
      get matches() {
        return one.matches
      },
      media,
      removeEventListener: (_: string, listener: () => void) => one.listeners.delete(listener),
    }
  }) as never
}

describe('webEnvironment', () => {
  test('reads a light, left-to-right page at a font scale of 1, on the web, with motion', () => {
    stubMatchMedia()
    expect(webEnvironment.read()).toEqual({
      colorScheme: 'light',
      direction: 'ltr',
      fontScale: 1,
      insets: { bottom: 0, left: 0, right: 0, top: 0 },
      platform: 'web',
      reducedMotion: false,
      screenReader: false,
      window: { height: innerHeight, width: innerWidth },
    })
  })

  test('calls an observer when the window is resized to a new size', () => {
    stubMatchMedia()
    const heard: Conditions[] = []
    const stop = webEnvironment.observe((conditions) => heard.push(conditions))
    dispatchEvent(new Event('resize'))
    expect(heard).toEqual([])
    const width = innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width + 100 })
    dispatchEvent(new Event('resize'))
    stop()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    expect(heard.map((conditions) => conditions.window.width)).toEqual([width + 100])
  })

  test('reads the color scheme and reduced motion through `matchMedia`', () => {
    stubMatchMedia()
    prefer(DARK, true)
    prefer(REDUCE, true)
    const now = webEnvironment.read()
    expect(now.colorScheme).toBe('dark')
    expect(now.reducedMotion).toBe(true)
  })

  test('reads the direction of the document element', () => {
    stubMatchMedia()
    document.documentElement.setAttribute('dir', 'rtl')
    expect(webEnvironment.read().direction).toBe('rtl')
  })

  test('calls an observer when either media query changes', () => {
    stubMatchMedia()
    const heard: Conditions[] = []
    const stop = webEnvironment.observe((conditions) => heard.push(conditions))
    prefer(DARK, true)
    prefer(REDUCE, true)
    stop()
    expect(heard.map((one) => [one.colorScheme, one.reducedMotion])).toEqual([
      ['dark', false],
      ['dark', true],
    ])
  })

  test('calls an observer when the document element’s `dir` changes', async () => {
    stubMatchMedia()
    const heard: Conditions[] = []
    const stop = webEnvironment.observe((conditions) => heard.push(conditions))
    document.documentElement.setAttribute('dir', 'rtl')
    await settle()
    stop()
    expect(heard.map((one) => one.direction)).toEqual(['rtl'])
  })

  test('calls no observer where a `dir` is written again with the same value', async () => {
    stubMatchMedia()
    document.documentElement.setAttribute('dir', 'rtl')
    const heard: Conditions[] = []
    const stop = webEnvironment.observe((conditions) => heard.push(conditions))
    document.documentElement.setAttribute('dir', 'rtl')
    await settle()
    stop()
    expect(heard).toEqual([])
  })

  test('stops listening to the media queries and the `dir` once stopped', async () => {
    stubMatchMedia()
    const heard: Conditions[] = []
    webEnvironment.observe((conditions) => heard.push(conditions))()
    expect(query(DARK).listeners.size).toBe(0)
    expect(query(REDUCE).listeners.size).toBe(0)
    document.documentElement.setAttribute('dir', 'rtl')
    await settle()
    expect(heard).toEqual([])
  })
})
