import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { pauseMotion } from '@fusion.dev/helix-core'
import { hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  pauseMotion(false)
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

type Rotating = HTMLElement & { interval: number; turn(): void; updateComplete: Promise<unknown> }

const words = async (): Promise<Rotating> => {
  const host = (await mount(
    '<helix-rotating-text><span>faster</span><span>simpler</span><span>steadier</span></helix-rotating-text>',
  )) as Rotating
  await settle()
  return host
}

describe('rotating text', () => {
  test('says once that it holds more than six words, since the seventh never shows', async () => {
    const slot = Symbol.for('fusion.dev/helix/runtime')
    const store = globalThis as Record<symbol, unknown>
    const seen: { kind: string; tag?: string }[] = []
    store[slot] = (event: { kind: string; tag?: string }) => {
      seen.push(event)
      return true
    }
    try {
      const spans = (n: number) =>
        Array.from({ length: n }, (_, i) => `<span>word${i + 1}</span>`).join('')
      await mount(`<helix-rotating-text>${spans(6)}</helix-rotating-text>`)
      await settle()
      expect(seen).toHaveLength(0)
      const host = (await mount(
        `<helix-rotating-text>${spans(7)}</helix-rotating-text>`,
      )) as Rotating
      await settle()
      host.append(document.createElement('span'))
      await settle()
      expect(seen.map((one) => [one.kind, one.tag])).toEqual([
        ['too-many-words', 'helix-rotating-text'],
      ])
    } finally {
      delete store[slot]
    }
  })

  test('shows the next word and has the one showing leave, and comes round to the first', async () => {
    const host = await words()
    host.turn()
    expect(hasState(host, 'rotating')).toBe(true)
    expect(hasState(host, 'show-2')).toBe(true)
    expect(hasState(host, 'leave-1')).toBe(true)
    host.turn()
    host.turn()
    expect(hasState(host, 'show-1')).toBe(true)
    expect(hasState(host, 'leave-3')).toBe(true)
    expect(hasState(host, 'show-2')).toBe(false)
  })

  test('turns by itself every interval', async () => {
    const host = await words()
    host.interval = 20
    await host.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 70))
    expect(hasState(host, 'rotating')).toBe(true)
  })

  test('holds while the page has paused its motion', async () => {
    const host = await words()
    host.interval = 20
    await host.updateComplete
    pauseMotion()
    await settle()
    expect(hasState(host, 'paused')).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 70))
    expect(hasState(host, 'rotating')).toBe(false)
  })
})
