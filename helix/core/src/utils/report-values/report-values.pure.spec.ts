import { describe, expect, test } from 'bun:test'
import { reportValues } from './report-values.js'

/** An `ElementInternals` that records what it was handed, which is all `reportValues` touches. */
const recorder = () => {
  const calls: [FormData | string | null, FormData | string | undefined][] = []
  const internals = {
    setFormValue: (value: FormData | string | null, state?: FormData | string) => {
      calls.push([value, state])
    },
  } as unknown as ElementInternals
  return { calls, internals }
}

describe('a control reporting several answers to its form', () => {
  test('each answer is its own entry, and the joined string is the state', () => {
    const { calls, internals } = recorder()
    reportValues(internals, 'tags', ['a', 'b'])
    const [value, state] = calls[0] ?? []
    expect((value as FormData).getAll('tags')).toEqual(['a', 'b'])
    expect(state).toBe('a,b')
  })

  /* The Toggle Group defect: `b,1` saved as part of `b,1,i` came back from the
     browser as three answers, `b`, `1` and `i`. */
  test("with state 'entries' the form data is the state, so an answer holding a comma comes back whole", () => {
    const { calls, internals } = recorder()
    reportValues(internals, 'format', ['b,1', 'i'], { state: 'entries' })
    const [value, state] = calls[0] ?? []
    expect(state === value).toBe(true)
    expect((state as FormData).getAll('format')).toEqual(['b,1', 'i'])
  })

  test('no name or no answers clears the value, whichever state is asked for', () => {
    const { calls, internals } = recorder()
    reportValues(internals, '', ['a'], { state: 'entries' })
    reportValues(internals, 'tags', [])
    expect(calls).toEqual([
      [null, undefined],
      [null, undefined],
    ])
  })
})
