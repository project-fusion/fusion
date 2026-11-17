import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/** An observer the spec answers by hand, standing in for the browser's. */
class Watcher {
  static last: Watcher | undefined

  readonly heard: (entries: { isIntersecting: boolean }[]) => void

  constructor(heard: (entries: { isIntersecting: boolean }[]) => void) {
    this.heard = heard
    Watcher.last = this
  }

  observe(): void {}

  disconnect(): void {}
}

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** Mounts with the stand-in observer in place, and puts the page's own back after. */
const watched = async (markup: string): Promise<HTMLElement> => {
  const own = globalThis.IntersectionObserver
  globalThis.IntersectionObserver = Watcher as unknown as typeof IntersectionObserver
  try {
    return await mount(markup)
  } finally {
    globalThis.IntersectionObserver = own
  }
}

describe('highlighter', () => {
  test('marks the words as a mark does', async () => {
    const host = await watched('<helix-highlighter>shipped on time</helix-highlighter>')
    expect(part(host, 'mark')?.localName).toBe('mark')
  })

  test('draws the band once the words come into view, and not before', async () => {
    const host = await watched('<helix-highlighter>shipped on time</helix-highlighter>')
    Watcher.last?.heard([{ isIntersecting: false }])
    expect(hasState(host, 'drawn')).toBe(false)
    Watcher.last?.heard([{ isIntersecting: true }])
    expect(hasState(host, 'drawn')).toBe(true)
  })
})
