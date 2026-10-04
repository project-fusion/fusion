import { afterEach, describe, expect, test } from 'bun:test'
import { RUNTIME_LOG, RUNTIME_SLOT, type RuntimeEvent, reportRuntime } from './report-runtime.js'

const store = globalThis as Record<symbol, unknown>

/** What a console method was handed while `during` runs, with nothing printed. */
const captured = (method: 'error' | 'warn', during: () => void): unknown[][] => {
  const calls: unknown[][] = []
  const original = console[method]
  console[method] = (...args: unknown[]) => {
    calls.push(args)
  }
  try {
    during()
  } finally {
    console[method] = original
  }
  return calls
}

const event: RuntimeEvent = {
  kind: 'missing-row-key',
  message: '<helix-data-table selectable> has no `row-key`.',
  tag: 'helix-data-table',
}

afterEach(() => {
  delete store[RUNTIME_SLOT]
  delete store[RUNTIME_LOG]
})

describe('reportRuntime', () => {
  test('with nothing listening, it prints the sentence and keeps the event', () => {
    const calls = captured('warn', () => reportRuntime(event))
    expect(calls).toEqual([[event.message]])
    expect(store[RUNTIME_LOG]).toEqual([event])
  })

  test('what else the event carries is printed after the sentence', () => {
    const error = new Error('denied')
    const calls = captured('warn', () => reportRuntime({ ...event, detail: error }))
    expect(calls).toEqual([[event.message, error]])
  })

  test('an error is printed as one', () => {
    const calls = captured('error', () => reportRuntime({ ...event, level: 'error' }))
    expect(calls).toEqual([[event.message]])
  })

  test('a listener hears each event, and keeps core quiet only when it says so', () => {
    const heard: RuntimeEvent[] = []
    store[RUNTIME_SLOT] = (one: RuntimeEvent) => {
      heard.push(one)
      return one.tag === 'helix-quiet'
    }
    const calls = captured('warn', () => {
      reportRuntime(event)
      reportRuntime({ ...event, tag: 'helix-quiet' })
    })
    expect(heard.map((one) => one.tag)).toEqual(['helix-data-table', 'helix-quiet'])
    expect(calls).toEqual([[event.message]])
  })

  test('a listener that throws is said once, and the event still prints', () => {
    store[RUNTIME_SLOT] = () => {
      throw new Error('a listener')
    }
    const errors = captured('error', () => {
      const warnings = captured('warn', () => {
        reportRuntime(event)
        reportRuntime(event)
      })
      expect(warnings).toHaveLength(2)
    })
    expect(errors).toHaveLength(1)
    expect(String(errors[0]?.[0])).toContain('a runtime listener threw')
  })

  test('the log keeps the first two hundred, which a late listener reads', () => {
    captured('warn', () => {
      for (let at = 0; at < 250; at += 1) {
        reportRuntime({ ...event, message: String(at) })
      }
    })
    const log = store[RUNTIME_LOG] as RuntimeEvent[]
    expect(log).toHaveLength(200)
    expect(log[0]?.message).toBe('0')
  })
})
