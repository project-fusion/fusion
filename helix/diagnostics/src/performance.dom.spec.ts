import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(() => {
  registerDom()
})

const { report } = await import('./console.js')
const { diagnose } = await import('./diagnose.js')
const { INSTANCE, initDiagnostics } = await import('./init.js')
const { helixOf, percentile, RENDER_SLOT, shares } = await import('./performance.js')
const { watch } = await import('./usage.js')

const store = globalThis as Record<symbol, unknown>

const tiers = [
  {
    lint: {
      package: '@fusion.dev/helix',
      tags: {
        'helix-button': { attributes: {}, hooks: [], parts: [], written: [] },
        'helix-card': { attributes: {}, hooks: [], parts: [], written: [] },
      },
    },
  },
]

/** Times a first update the way `@fusion.dev/helix-core` does, through its slot. */
const rendered = (tag: string, start: number, duration: number): void => {
  const listener = store[RENDER_SLOT]
  if (typeof listener === 'function') {
    listener(document.createElement(tag), { duration, start })
  }
}

/** Every console method quiet while `during` runs, and what each was handed. */
const recorded = (during: () => void): [string, string][] => {
  const methods = ['debug', 'error', 'group', 'groupCollapsed', 'groupEnd', 'info', 'warn'] as const
  const originals = methods.map((method) => console[method])
  const calls: [string, string][] = []
  for (const method of methods) {
    console[method] = (...args: unknown[]) => {
      calls.push([method, String(args[0])])
    }
  }
  try {
    during()
  } finally {
    methods.forEach((method, at) => {
      console[method] = originals[at] as never
    })
  }
  return calls
}

afterEach(() => {
  ;(store[INSTANCE] as { stop(): void } | undefined)?.stop()
  delete store[RENDER_SLOT]
  document.body.innerHTML = ''
})

describe('performance', () => {
  test('a percentile is the nearest rank', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(percentile(sorted, 0.5)).toBe(5)
    expect(percentile(sorted, 0.95)).toBe(10)
    expect(percentile([], 0.5)).toBe(0)
  })

  test('a shifted node belongs to the nearest Helix element, through shadow roots', () => {
    document.body.innerHTML =
      '<helix-card><p>Inside</p></helix-card><div><span>Outside</span></div>'
    const card = document.querySelector('helix-card') as HTMLElement
    const root = card.attachShadow({ mode: 'open' })
    root.innerHTML = '<div><b>Drawn</b></div>'
    expect(helixOf(card.querySelector('p'))).toBe('helix-card')
    expect(helixOf(root.querySelector('b'))).toBe('helix-card')
    expect(helixOf(document.querySelector('span'))).toBeUndefined()
  })

  test('a shift is shared among its sources, and one the reader caused counts for none', () => {
    document.body.innerHTML = '<helix-card></helix-card><helix-button></helix-button><div></div>'
    const [card, button, div] = [...document.body.children]
    const shared = shares({
      sources: [{ node: card }, { node: button }, { node: div }],
      value: 0.3,
    })
    expect([...shared].map(([tag, share]) => [tag, Math.round(share * 10) / 10])).toEqual([
      ['helix-card', 0.1],
      ['helix-button', 0.1],
    ])
    expect(shares({ hadRecentInput: true, sources: [{ node: card }], value: 0.3 }).size).toBe(0)
  })

  test('a measuring watcher gathers each tag’s first updates, and a run carries them', () => {
    const watcher = watch(document, { performance: true })
    for (const duration of [1, 2, 3, 4, 20]) {
      rendered('helix-button', 100, duration)
    }
    rendered('helix-card', 100, 5)
    const run = diagnose({ tiers, watcher })
    watcher.stop()
    expect(run.performance?.tags['helix-button']?.render).toEqual({
      count: 5,
      max: 20,
      p50: 3,
      p95: 20,
    })
    expect(run.performance?.tags['helix-card']?.render.count).toBe(1)
    /* happy-dom has no layout shift or long tasks, so neither was measured. */
    expect(run.performance?.measured).toEqual({ layoutShift: false, longTasks: false })
    expect(store[RENDER_SLOT]).toBeUndefined()
  })

  test('a watcher not asked to measure leaves the slot empty, and a run carries nothing', () => {
    const watcher = watch(document)
    expect(store[RENDER_SLOT]).toBeUndefined()
    const run = diagnose({ tiers, watcher })
    watcher.stop()
    expect(run.performance).toBeUndefined()
  })

  test('the console prints the slowest tags first, once while they stay the same', () => {
    const watcher = watch(document, { performance: true })
    rendered('helix-card', 100, 2)
    rendered('helix-button', 100, 9)
    const run = diagnose({ console: { performance: 'info' }, tiers, watcher })
    watcher.stop()
    const shown = new Set<string>()
    const first = recorded(() => report(run, console, { shown }))
    const second = recorded(() => report(run, console, { shown }))
    const printed = first.filter(([, text]) => text.startsWith('performance'))
    expect(printed).toHaveLength(1)
    expect(printed[0]?.[1].split('\n').slice(1)).toEqual([
      'helix-button: 9 ms median, 9 ms p95, 9 ms slowest, of 1 first update',
      'helix-card: 2 ms median, 2 ms p95, 2 ms slowest, of 1 first update',
    ])
    expect(second.filter(([, text]) => text.startsWith('performance'))).toHaveLength(0)
  })

  test('initDiagnostics() measures where the console or sending asks, and not otherwise', () => {
    recorded(() => {
      initDiagnostics({ environment: 'development', tiers })
    })
    expect(store[RENDER_SLOT]).toBeUndefined()
    ;(store[INSTANCE] as { stop(): void }).stop()
    recorded(() => {
      initDiagnostics({ environment: 'development', send: { performance: true }, tiers })
    })
    expect(typeof store[RENDER_SLOT]).toBe('function')
  })
})
