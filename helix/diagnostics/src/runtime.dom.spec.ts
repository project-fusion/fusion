import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(() => {
  registerDom()
})

const { ciSink } = await import('./ci.js')
const { resolveConfig } = await import('./config.js')
const { report } = await import('./console.js')
const { diagnose } = await import('./diagnose.js')
const { INSTANCE, initDiagnostics } = await import('./init.js')
const { RUNTIME_LOG, RUNTIME_SLOT } = await import('./runtime.js')
const { watch } = await import('./usage.js')

const store = globalThis as Record<symbol, unknown>

/** Lint data for one tag, the shape a published `lint.json` has. */
const tiers = [
  {
    lint: {
      package: '@fusion.dev/helix',
      tags: {
        'helix-data-table': { attributes: {}, hooks: [], parts: [], written: [] },
      },
    },
  },
]

/**
 * Reports an event the way `reportRuntime` in `@fusion.dev/helix-core` does:
 * kept in the log, handed to the listener, and printed unless the listener
 * says it prints it. Returns whether core printed it.
 */
const fromCore = (event: { kind: string; message: string; tag?: string }): boolean => {
  const log = Array.isArray(store[RUNTIME_LOG]) ? (store[RUNTIME_LOG] as unknown[]) : []
  log.push(event)
  store[RUNTIME_LOG] = log
  const listener = store[RUNTIME_SLOT]
  return !(typeof listener === 'function' && listener(event) === true)
}

const crowded = (rows: number) => ({
  kind: 'too-many-rows',
  message: `<helix-data-table> is drawing ${rows} rows at once.`,
  tag: 'helix-data-table',
})

/** Every console method quiet while `during` runs, and what each was handed. */
const recorded = async <T>(
  during: () => T,
): Promise<{ calls: [string, string][]; value: Awaited<T> }> => {
  const methods = ['debug', 'error', 'group', 'groupCollapsed', 'groupEnd', 'info', 'warn'] as const
  const originals = methods.map((method) => console[method])
  const calls: [string, string][] = []
  for (const method of methods) {
    console[method] = (...args: unknown[]) => {
      calls.push([method, String(args[0])])
    }
  }
  try {
    return { calls, value: await during() }
  } finally {
    methods.forEach((method, at) => {
      console[method] = originals[at] as never
    })
  }
}

afterEach(() => {
  ;(store[INSTANCE] as { stop(): void } | undefined)?.stop()
  delete store[RUNTIME_SLOT]
  delete store[RUNTIME_LOG]
  document.body.innerHTML = ''
})

describe('runtime events', () => {
  test('a watcher counts the ones core kept from before it, and the ones after', () => {
    fromCore(crowded(3000))
    const watcher = watch(document)
    expect(fromCore(crowded(3200))).toBe(true)
    fromCore({ kind: 'missing-row-key', message: 'No `row-key`.', tag: 'helix-data-table' })
    const runtime = watcher.runtime()
    watcher.stop()
    /* The numbers in a sentence are not part of what the event is. */
    expect(runtime.map((one) => [one.kind, one.count, one.printed])).toEqual([
      ['too-many-rows', 2, true],
      ['missing-row-key', 1, true],
    ])
    expect(store[RUNTIME_SLOT]).toBeUndefined()
  })

  test('quiet, core leaves the printing to diagnostics, and the entry says so', () => {
    const watcher = watch(document, { quiet: () => true })
    expect(fromCore(crowded(3000))).toBe(false)
    expect(watcher.runtime()[0]?.printed).toBe(false)
    watcher.stop()
  })

  test('a run without a watcher reads what core kept', () => {
    fromCore(crowded(3000))
    const run = diagnose({ tiers })
    expect(run.runtime.map((one) => one.kind)).toEqual(['too-many-rows'])
  })

  test('a tag core reported registered twice is the duplicate finding, named', () => {
    fromCore({ kind: 'duplicate-registration', message: 'Two copies.', tag: 'helix-data-table' })
    const run = diagnose({ tiers })
    expect(run.findings.map((one) => `${one.kind} ${one.tag}`)).toEqual([
      'duplicate-registration helix-data-table',
    ])
  })

  test('the console prints only what core left to it, once, and the heading counts all', async () => {
    let quiet = true
    const watcher = watch(document, { quiet: () => quiet })
    fromCore(crowded(3000))
    quiet = false
    fromCore({ kind: 'missing-row-key', message: 'No `row-key`.', tag: 'helix-data-table' })
    const run = diagnose({ tiers, watcher })
    watcher.stop()
    const shown = new Set<string>()
    const first = await recorded(() => report(run, console, { shown }))
    const second = await recorded(() => report(run, console, { shown }))
    expect(first.calls[0]).toEqual([
      'group',
      'helix diagnostics: 0 errors, 0 warnings, 0 info, 2 runtime',
    ])
    expect(first.calls.filter(([method]) => method === 'warn')).toEqual([
      [
        'warn',
        'too-many-rows <helix-data-table>: <helix-data-table> is drawing 3000 rows at once.',
      ],
    ])
    expect(second.calls.filter(([method]) => method === 'warn')).toEqual([])
  })

  test('`console.runtime: off` prints none of them', async () => {
    const watcher = watch(document, { quiet: () => true })
    fromCore(crowded(3000))
    const run = diagnose({ console: { runtime: 'off' }, tiers, watcher })
    watcher.stop()
    const { calls } = await recorded(() => report(run))
    expect(calls.filter(([method]) => method === 'warn')).toEqual([])
  })

  test('the settings take `core.warnings` and `console.runtime`, and nothing else there', () => {
    expect(resolveConfig({ core: { warnings: false } }, undefined).configuration.core).toEqual({
      warnings: false,
    })
    expect(() => resolveConfig({ core: { warning: false } } as never, undefined)).toThrow(
      'The closest is `core.warnings`',
    )
    expect(() => resolveConfig({ console: { runtime: 'info' } } as never, undefined)).toThrow(
      '`warn`, `off`',
    )
  })

  test('with `core.warnings: false`, initDiagnostics() prints it, lists it in the overlay, and runs again', async () => {
    const { value } = await recorded(async () => {
      const handle = initDiagnostics({
        core: { warnings: false },
        environment: 'development',
        tiers,
      })
      handle.run()
      const printed = fromCore(crowded(3000))
      const run = handle.run()
      const overlay = document.querySelector('helix-diagnostics-overlay')?.shadowRoot
      return {
        badge: overlay?.querySelector('.badge')?.textContent,
        items: [...(overlay?.querySelectorAll('li .kind') ?? [])].map((one) => one.textContent),
        printed,
        runtime: run?.runtime.map((one) => one.kind),
      }
    })
    expect(value.printed).toBe(false)
    expect(value.runtime).toEqual(['too-many-rows'])
    expect(value.badge).toContain('1 runtime')
    expect(value.items).toEqual(['warn too-many-rows'])
  })

  test('the CI summary names each runtime event once, with its pages, and does not fail on it', () => {
    fromCore(crowded(3000))
    const run = diagnose({ page: '/one', tiers })
    const again = diagnose({ page: '/two', tiers })
    const { code, summary } = ciSink([run, again], { file: '/tmp/helix-runtime-ci.json' })
    expect(code).toBe(0)
    expect(summary).toContain('1 runtime')
    expect(summary).toContain('runtime too-many-rows <helix-data-table>')
    expect(summary).toContain('on /one, /two')
  })
})
