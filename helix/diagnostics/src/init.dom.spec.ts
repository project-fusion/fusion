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

/**
 * Every console method quiet while `during` runs, so a spec's output is its
 * own, with the methods called, in order.
 */
const silenced = async <T>(during: () => T): Promise<{ called: string[]; value: Awaited<T> }> => {
  const methods = ['debug', 'error', 'group', 'groupCollapsed', 'groupEnd', 'info', 'warn'] as const
  const originals = methods.map((method) => console[method])
  const called: string[] = []
  for (const method of methods) {
    console[method] = () => {
      called.push(method)
    }
  }
  try {
    return { called, value: await during() }
  } finally {
    methods.forEach((method, at) => {
      console[method] = originals[at] as never
    })
  }
}

/** Every console method quiet while `during` runs. */
const quietly = async <T>(during: () => T): Promise<Awaited<T>> => (await silenced(during)).value

/** A pretend relay behind `fetch`, recording each address asked and each run posted. */
const pretend = (answers: boolean, settings?: object) => {
  const asked: string[] = []
  const posted: string[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    asked.push(url)
    if (!answers) {
      throw new TypeError('Failed to fetch')
    }
    if (url.endsWith('/health')) {
      return new Response('{"relay":"helix diagnostics"}', { status: 200 })
    }
    if (url.endsWith('/config')) {
      return settings
        ? new Response(JSON.stringify(settings), { status: 200 })
        : new Response('', { status: 404 })
    }
    if (url.endsWith('/runs') && init?.method === 'POST') {
      posted.push(String(init.body))
      return new Response(null, { status: 204 })
    }
    return new Response('', { status: 404 })
  }) as typeof fetch
  return { asked, posted, restore: () => (globalThis.fetch = original) }
}

/** Long enough for the pretend relay's answers to arrive. */
const settle = () => new Promise((done) => setTimeout(done, 20))

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

describe('the overlay', () => {
  const overlayOf = () => document.querySelector('helix-diagnostics-overlay')?.shadowRoot

  test('it is put on the page only once there is something to show, and lists each finding', async () => {
    await quietly(() => {
      const handle = initDiagnostics({ environment: 'development', tiers })
      handle.run()
      expect(document.querySelector('helix-diagnostics-overlay')).toBeNull()
      document.body.insertAdjacentHTML('beforeend', '<helix-button emphasis="bold"></helix-button>')
      handle.run()
    })
    const root = overlayOf()
    const badge = root?.querySelector('.badge') as HTMLButtonElement | null | undefined
    expect(badge?.hidden).toBe(false)
    expect(badge?.textContent).toContain('1 error')
    badge?.click()
    expect((root?.querySelector('.panel') as HTMLElement | null)?.hidden).toBe(false)
    expect(root?.querySelectorAll('li')).toHaveLength(1)
    expect(root?.querySelector('li .subject')?.textContent).toBe('<helix-button emphasis="bold">')
    const host = document.querySelector('helix-diagnostics-overlay') as HTMLElement
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect((root?.querySelector('.panel') as HTMLElement | null)?.hidden).toBe(true)
  })

  test('it is left out of usage, and off when the settings say so', async () => {
    document.body.innerHTML = '<helix-button emphasis="bold"></helix-button>'
    const run = await quietly(() => {
      const handle = initDiagnostics({ environment: 'development', tiers })
      handle.run()
      return handle.run()
    })
    expect(run?.usage.unlisted).toEqual({})
    ;(globalThis as Record<symbol, { stop(): void } | undefined>)[INSTANCE]?.stop()
    expect(document.querySelector('helix-diagnostics-overlay')).toBeNull()
    await quietly(() => {
      initDiagnostics({ environment: 'development', sinks: { overlay: false }, tiers }).run()
    })
    expect(document.querySelector('helix-diagnostics-overlay')).toBeNull()
  })
})

describe('the relay', () => {
  test('a run goes to the relay once it answers, and a run like the last is not sent again', async () => {
    const relay = pretend(true)
    try {
      await quietly(async () => {
        const handle = initDiagnostics({
          environment: 'development',
          sinks: { relay: true },
          tiers,
        })
        await settle()
        handle.run()
        handle.run()
        document.body.innerHTML = '<helix-button emphasis="bold"></helix-button>'
        handle.run()
      })
      expect(relay.posted).toHaveLength(2)
      expect(JSON.parse(relay.posted[1] ?? '{}').findings[0].kind).toBe('invalid-value')
    } finally {
      relay.restore()
    }
  })

  test('the settings the relay serves are used where none were given', async () => {
    const relay = pretend(true, { rules: { 'invalid-value': 'off' } })
    try {
      document.body.innerHTML = '<helix-button emphasis="bold"></helix-button>'
      const run = await quietly(async () => {
        const handle = initDiagnostics({
          environment: 'development',
          sinks: { relay: true },
          tiers,
        })
        await settle()
        return handle.run()
      })
      expect(run?.findings).toEqual([])
      expect(run?.configuration.silenced).toEqual([
        { count: 1, kind: 'invalid-value', layer: 'file' },
      ])
    } finally {
      relay.restore()
    }
  })

  test('with no relay there, it says so once and sends nothing', async () => {
    const relay = pretend(false)
    try {
      const warnings = await captured('warn', async () => {
        const handle = initDiagnostics({
          environment: 'development',
          sinks: { relay: true },
          tiers,
        })
        await settle()
        await quietly(() => handle.run())
      })
      expect(warnings.filter((call) => String(call[0]).includes('no relay at'))).toHaveLength(1)
      expect(relay.posted).toHaveLength(0)
    } finally {
      relay.restore()
    }
  })

  test('a relay address must be an origin on a local host, and the setting says what it takes', async () => {
    for (const relay of [
      'ftp://nowhere',
      'https://collector.example.com',
      'http://127.0.0.1:7417/',
    ]) {
      const calls = await captured('error', () => {
        expect(
          initDiagnostics({ environment: 'development', sinks: { relay }, tiers }).active,
        ).toBe(false)
      })
      expect(String(calls[0]?.[0])).toContain(
        'an address on a local host, such as `http://127.0.0.1:7417`',
      )
    }
    const relay = pretend(true)
    try {
      await quietly(async () => {
        initDiagnostics({
          environment: 'development',
          sinks: { relay: 'http://shop.localhost:7500' },
          tiers,
        })
        await settle()
      })
      expect(relay.asked[0]).toBe('http://shop.localhost:7500/health')
    } finally {
      relay.restore()
    }
  })
})

describe('each environment', () => {
  test('in production a run goes to the app alone, with nothing printed, shown, or relayed', async () => {
    const relay = pretend(true)
    try {
      document.body.innerHTML = '<helix-button emphasis="bold"></helix-button>'
      const runs: unknown[] = []
      const { called } = await silenced(async () => {
        const handle = initDiagnostics({
          environment: 'production',
          environments: { production: { sample: 1 } },
          onReport: (run) => runs.push(run),
          sinks: { relay: true },
          tiers,
        })
        await settle()
        handle.run()
      })
      expect(runs).toHaveLength(1)
      expect(called).toEqual([])
      expect(document.querySelector('helix-diagnostics-overlay')).toBeNull()
      expect(relay.asked).toEqual([])
    } finally {
      relay.restore()
    }
  })

  test('in CI the console and the relay have each run, and the overlay is never put on the page', async () => {
    const relay = pretend(true)
    try {
      document.body.innerHTML = '<helix-button emphasis="bold"></helix-button>'
      const { called } = await silenced(async () => {
        const handle = initDiagnostics({ environment: 'ci', sinks: { relay: true }, tiers })
        await settle()
        handle.run()
      })
      expect(called).toContain('error')
      expect(relay.posted).toHaveLength(1)
      expect(document.querySelector('helix-diagnostics-overlay')).toBeNull()
    } finally {
      relay.restore()
    }
  })
})
