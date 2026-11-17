import '@fusion.dev/helix-testing/dom/register'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/** An observer the spec answers by hand, standing in for the browser's. */
class Watcher {
  static last: Watcher | undefined

  readonly heard: (entries: { isIntersecting: boolean }[]) => void

  stopped = false

  constructor(heard: (entries: { isIntersecting: boolean }[]) => void) {
    this.heard = heard
    Watcher.last = this
  }

  observe(): void {}

  disconnect(): void {
    this.stopped = true
  }
}

const original = globalThis.IntersectionObserver

beforeAll(async () => {
  registerDom()
  globalThis.IntersectionObserver = Watcher as unknown as typeof IntersectionObserver
  await import('../index.js')
})

afterEach(() => {
  Watcher.last = undefined
})

afterAll(() => {
  globalThis.IntersectionObserver = original
})

describe('reveal', () => {
  test('shows at once what is in view on arrival', async () => {
    const reveal = await mount('<helix-reveal><p>Section</p></helix-reveal>')
    Watcher.last?.heard([{ isIntersecting: true }])
    expect(hasState(reveal, 'waiting')).toBe(false)
    expect(Watcher.last?.stopped).toBe(true)
  })

  test('waits below the view, and comes in once it scrolls into view', async () => {
    const reveal = await mount('<helix-reveal><p>Section</p></helix-reveal>')
    const watcher = Watcher.last
    watcher?.heard([{ isIntersecting: false }])
    expect(hasState(reveal, 'waiting')).toBe(true)
    watcher?.heard([{ isIntersecting: true }])
    expect(hasState(reveal, 'waiting')).toBe(false)
    expect(watcher?.stopped).toBe(true)
  })

  test('stops waiting when it leaves the page', async () => {
    const reveal = await mount('<helix-reveal><p>Section</p></helix-reveal>')
    Watcher.last?.heard([{ isIntersecting: false }])
    reveal.remove()
    expect(hasState(reveal, 'waiting')).toBe(false)
  })
})
