import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(() => {
  registerDom()
})

const { INSTANCE, initDiagnostics } = await import('./init.js')

/** Lint data for one tag, the shape a published `lint.json` has. */
const tiers = [
  {
    lint: {
      package: '@fusion.dev/helix',
      tags: {
        'helix-button': {
          attributes: { emphasis: ['ghost', 'solid'], label: null },
          hooks: ['--button-radius'],
          parts: ['button'],
          written: [],
        },
      },
    },
  },
]

/** What a console method was handed, in calls, while `during` runs. */
const captured = async (method: 'error' | 'info' | 'warn', during: () => unknown) => {
  const calls: unknown[][] = []
  const original = console[method]
  console[method] = (...args: unknown[]) => {
    calls.push(args)
  }
  try {
    await during()
  } finally {
    console[method] = original
  }
  return calls
}

/** Every console method quiet while `during` runs, so a spec's output is its own. */
const quietly = async <T>(during: () => T): Promise<T> => {
  const methods = ['debug', 'error', 'group', 'groupCollapsed', 'groupEnd', 'info', 'warn'] as const
  const originals = methods.map((method) => console[method])
  for (const method of methods) {
    console[method] = () => {}
  }
  try {
    return await during()
  } finally {
    methods.forEach((method, at) => {
      console[method] = originals[at] as never
    })
  }
}

afterEach(() => {
  ;(globalThis as Record<symbol, { stop(): void } | undefined>)[INSTANCE]?.stop()
  document.body.innerHTML = ''
})

describe('initDiagnostics', () => {
  test('with no environment declared and no local host, it does nothing, and says why once', async () => {
    const calls = await captured('info', () => {
      expect(initDiagnostics({ tiers }).active).toBe(false)
      expect(initDiagnostics({ tiers }).active).toBe(false)
    })
    expect(calls).toHaveLength(1)
    expect(String(calls[0]?.[0])).toContain('no local host')
  })

  test('a setting that names nothing is printed, nothing starts, and nothing throws', async () => {
    const calls = await captured('error', () => {
      const handle = initDiagnostics({ environment: 'development', sends: {}, tiers } as never)
      expect(handle.active).toBe(false)
    })
    expect(String(calls[0]?.[0])).toContain('The closest is `send`')
  })

  test('a second call returns the first handle, and a call after stop starts afresh', async () => {
    await quietly(() => {
      const first = initDiagnostics({ environment: 'development', tiers })
      expect(initDiagnostics({ environment: 'development', tiers })).toBe(first)
      first.stop()
      expect(first.active).toBe(false)
      const next = initDiagnostics({ environment: 'development', tiers })
      expect(next).not.toBe(first)
      expect(next.active).toBe(true)
    })
  })

  test('a run goes to the callback, each subscriber, and the event, and one that throws stops none', async () => {
    const reached: string[] = []
    const errors = await quietly(() =>
      captured('error', () => {
        const handle = initDiagnostics({
          environment: 'development',
          onReport: () => reached.push('callback'),
          tiers,
        })
        handle.subscribe(() => {
          throw new Error('a subscriber')
        })
        handle.subscribe(() => reached.push('subscriber'))
        document.addEventListener('helix-diagnostics', () => reached.push('event'), { once: true })
        const run = handle.run()
        expect(run?.schema).toBe(1)
        expect(handle.latest).toBe(run)
      }),
    )
    expect(reached).toEqual(['callback', 'subscriber', 'event'])
    expect(errors.filter((call) => String(call[0]).includes('a subscriber threw'))).toHaveLength(1)
  })

  test('three failed runs in a row stop it, and say so', async () => {
    const errors = await quietly(() =>
      captured('error', () => {
        const handle = initDiagnostics({
          environment: 'development',
          tiers: [{ lint: null as never }],
        })
        handle.run()
        handle.run()
        expect(handle.active).toBe(true)
        handle.run()
        expect(handle.active).toBe(false)
      }),
    )
    expect(errors.some((call) => String(call[0]).includes('stopped after 3 failed runs'))).toBe(
      true,
    )
  })

  test('with no lint data and no network, it says so once and checks nothing', async () => {
    const warnings = await captured('warn', () => {
      const handle = initDiagnostics({ cdn: false, environment: 'development' })
      expect(handle.run()).toBeUndefined()
      expect(handle.run()).toBeUndefined()
    })
    expect(warnings).toHaveLength(1)
    expect(String(warnings[0]?.[0])).toContain('not checked')
  })

  test('a finding prints the first time it is found on a page, and not on the next run', async () => {
    document.body.innerHTML = '<helix-button emphasis="bold"></helix-button>'
    const errors = await quietly(() =>
      captured('error', () => {
        const handle = initDiagnostics({ environment: 'development', page: () => '/one', tiers })
        handle.run()
        handle.run()
      }),
    )
    expect(errors.filter((call) => String(call[0]).startsWith('invalid-value'))).toHaveLength(1)
  })

  test('it runs on its own once the page settles', async () => {
    const handle = await quietly(() => initDiagnostics({ environment: 'development', tiers }))
    expect(handle.latest).toBeUndefined()
    await quietly(() => new Promise((done) => setTimeout(done, 1300)))
    expect(handle.latest?.schema).toBe(1)
  })
})
