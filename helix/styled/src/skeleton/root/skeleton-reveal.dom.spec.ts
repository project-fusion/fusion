import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* happy-dom lays nothing out, runs no animation and its observers never
   report, so this file supplies all three: observers that report when the test
   flushes them, a height the test sets, and animations it records and ends.
   What is asserted is the reveal's bookkeeping; the movement itself is measured
   in a browser, by `skeleton-revealing.dom.spec.ts` and by hand. */
interface Watcher {
  report: () => void
  targets: Set<Element>
}

const watchers = new Set<Watcher>()
const original = globalThis.ResizeObserver
const originalMatch = globalThis.matchMedia

class Observer {
  private readonly watcher: Watcher
  constructor(report: () => void) {
    this.watcher = { report, targets: new Set() }
    watchers.add(this.watcher)
  }
  observe(target: Element): void {
    this.watcher.targets.add(target)
  }
  unobserve(target: Element): void {
    this.watcher.targets.delete(target)
  }
  disconnect(): void {
    this.watcher.targets.clear()
    watchers.delete(this.watcher)
  }
}

const flush = async (): Promise<void> => {
  for (const one of [...watchers]) {
    if (one.targets.size > 0) {
      one.report()
    }
  }
  for (let turn = 0; turn < 4; turn++) {
    await Promise.resolve()
  }
}

interface Move {
  end: () => void
  keyframes: Keyframe[]
  options: KeyframeAnimationOptions
}

/** Records the animations an element starts, each ended when the test says. */
const record = (element: HTMLElement): Move[] => {
  const moves: Move[] = []
  element.animate = ((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    let end = (): void => undefined
    const finished = new Promise<void>((resolve) => {
      end = resolve
    })
    moves.push({ end: () => end(), keyframes, options })
    return { cancel: () => end(), finished } as unknown as Animation
  }) as HTMLElement['animate']
  return moves
}

type Skeleton = HTMLElement & { loading: boolean; updateComplete: Promise<unknown> }

const markup = `<helix-skeleton
  loading
  style="--skeleton-reveal-duration: 320ms; --skeleton-reveal-easing: linear; --helix-duration-fade: 120ms"
><div slot="placeholder"></div><p>Loaded</p></helix-skeleton>`

/** A skeleton drawn at `height`, which the test moves, with its animations recorded. */
const skeleton = async () => {
  const box = { height: 40 }
  const host = (await mount(markup)) as Skeleton
  host.getBoundingClientRect = () => ({ height: box.height }) as DOMRect
  await flush()
  return {
    box,
    content: record(part(host, 'content') as HTMLElement),
    height: record(host),
    host,
    placeholder: record(part(host, 'placeholder') as HTMLElement),
  }
}

beforeEach(() => {
  globalThis.ResizeObserver = Observer as unknown as typeof ResizeObserver
})

afterEach(() => {
  globalThis.ResizeObserver = original
  globalThis.matchMedia = originalMatch
  watchers.clear()
})

describe('the reveal', () => {
  test('moves the height from the one last drawn while the two sides crossfade on the hooks', async () => {
    const { box, content, height, host, placeholder } = await skeleton()
    // The page puts the content in and takes `loading` off in one task, so
    // the box measured then is already the content's height.
    box.height = 100
    host.loading = false
    await host.updateComplete
    expect(hasState(host, 'revealing')).toBe(true)
    expect(part(host, 'placeholder')?.hidden).toBe(true)
    await flush()
    expect(height[0]?.keyframes).toEqual([{ blockSize: '40px' }, { blockSize: '100px' }])
    expect(height[0]?.options).toEqual({ duration: 320, easing: 'linear' })
    expect(content[0]?.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }])
    expect(placeholder[0]?.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }])
    expect(placeholder[0]?.options).toMatchObject({ duration: 320, fill: 'forwards' })
    for (const one of [...height, ...content, ...placeholder]) {
      one.end()
    }
    await flush()
    expect(hasState(host, 'revealing')).toBe(false)
  })

  test('crossfades back when loading is set again', async () => {
    const { content, host, placeholder } = await skeleton()
    host.loading = false
    await host.updateComplete
    await flush()
    for (const one of [...content, ...placeholder]) {
      one.end()
    }
    await flush()
    host.loading = true
    await host.updateComplete
    await flush()
    expect(placeholder.at(-1)?.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }])
    expect(content.at(-1)?.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }])
  })

  test('under reduced motion the height changes at once, and the sides fade over the fade token', async () => {
    globalThis.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as typeof matchMedia
    const { box, content, height, host } = await skeleton()
    box.height = 100
    host.loading = false
    await host.updateComplete
    await flush()
    expect(height).toHaveLength(0)
    expect(content[0]?.options).toEqual({ duration: 120, easing: 'linear' })
  })

  test('0ms turns it off, and nothing is left revealing', async () => {
    const { content, height, host } = await skeleton()
    host.style.setProperty('--skeleton-reveal-duration', '0ms')
    host.loading = false
    await host.updateComplete
    await flush()
    expect(height).toHaveLength(0)
    expect(content).toHaveLength(0)
    expect(hasState(host, 'revealing')).toBe(false)
  })

  test('the first update reveals nothing, and neither does a skeleton holding nothing', async () => {
    const host = (await mount('<helix-skeleton loading></helix-skeleton>')) as Skeleton
    const moves = record(host)
    host.loading = false
    await host.updateComplete
    await flush()
    expect(moves).toHaveLength(0)
    expect(hasState(host, 'revealing')).toBe(false)
  })
})
