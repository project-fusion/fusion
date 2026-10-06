import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { applyOwnRule } from './own-rule.js'

beforeAll(() => {
  registerDom()
})

/* A stand-in for a field's internals: the last verdict it was given. */
const internals = (): ElementInternals & { said: unknown[] } => {
  const held = {
    said: [] as unknown[],
    setValidity(flags: ValidityStateFlags, message?: string) {
      held.said = [flags, message]
    },
  }
  return held as unknown as ElementInternals & { said: unknown[] }
}

describe("a page's own rule for a field", () => {
  test('marks the field with its message, or its messages joined', () => {
    const control = document.createElement('input')
    const one = internals()
    applyOwnRule(one, control, () => 'Too short.', 'ab')
    expect(one.said).toEqual([{ customError: true }, 'Too short.'])
    const many = internals()
    applyOwnRule(many, control, () => ['Too short.', 'Needs a digit.'], 'ab')
    expect(many.said).toEqual([{ customError: true }, 'Too short. Needs a digit.'])
  })

  test('accepts with true, null or nothing, and says nothing', () => {
    const control = document.createElement('input')
    for (const answer of [true, null, undefined, '', []] as const) {
      const held = internals()
      applyOwnRule(held, control, () => answer as never, 'abc')
      expect(held.said).toEqual([])
    }
    const none = internals()
    applyOwnRule(none, control, undefined, 'abc')
    expect(none.said).toEqual([])
  })

  test('is not asked while the browser finds the value wrong', () => {
    const control = document.createElement('input')
    control.required = true
    let asked = false
    const held = internals()
    applyOwnRule(
      held,
      control,
      () => {
        asked = true
        return 'Mine.'
      },
      '',
    )
    expect([asked, held.said]).toEqual([false, []])
  })
})
