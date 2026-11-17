import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
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

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/**
 * Mounts with the stand-in observer in place, and puts the page's own back
 * after, so no other spec sharing the page watches through it.
 */
const watched = async (markup: string): Promise<HTMLElement> => {
  const own = globalThis.IntersectionObserver
  globalThis.IntersectionObserver = Watcher as unknown as typeof IntersectionObserver
  try {
    return await mount(markup)
  } finally {
    globalThis.IntersectionObserver = own
  }
}

afterEach(() => {
  Watcher.last = undefined
})

describe('reveal', () => {
  test('shows at once what is in view on arrival', async () => {
    const reveal = await watched('<helix-reveal><p>Section</p></helix-reveal>')
    Watcher.last?.heard([{ isIntersecting: true }])
    expect(hasState(reveal, 'waiting')).toBe(false)
    expect(Watcher.last?.stopped).toBe(true)
  })

  test('waits below the view, and comes in once it scrolls into view', async () => {
    const reveal = await watched('<helix-reveal><p>Section</p></helix-reveal>')
    const watcher = Watcher.last
    watcher?.heard([{ isIntersecting: false }])
    expect(hasState(reveal, 'waiting')).toBe(true)
    watcher?.heard([{ isIntersecting: true }])
    expect(hasState(reveal, 'waiting')).toBe(false)
    expect(watcher?.stopped).toBe(true)
  })

  test('stops waiting when it leaves the page', async () => {
    const reveal = await watched('<helix-reveal><p>Section</p></helix-reveal>')
    Watcher.last?.heard([{ isIntersecting: false }])
    reveal.remove()
    expect(hasState(reveal, 'waiting')).toBe(false)
  })
})
