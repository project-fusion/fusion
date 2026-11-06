import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Declaration, Family, Rule, Value } from './form.js'
import { style } from './style.js'

const NATIVE: Readonly<Record<string, string>> = {
  'flex-grow': 'flexGrow',
  'flex-shrink': 'flexShrink',
  opacity: 'opacity',
}

/** A family of one part with `set` declared on it. */
const one = (set: readonly Declaration[]): Family => ({
  name: 'mark',
  rules: [
    {
      kind: 'rule',
      order: 0,
      set,
      specificity: [0, 1, 0],
      target: 'mark',
      values: [],
      webOnly: false,
      when: [],
    } as Rule,
  ],
  tag: 'helix-mark',
  tree: [{ kind: 'box', name: 'mark' }],
  version: '2.0',
})

const drawn = (set: readonly Declaration[], hooks: Record<string, string> = {}) =>
  style(one(set), 'mark', { conditions: {}, hooks, tokens: {} }).style as Record<string, unknown>

/** Every declaration of a number property in the value `from`, wherever it sits. */
const declared = (from: unknown, found: [string, Value][] = []): [string, Value][] => {
  if (Array.isArray(from)) {
    const [name, value] = from
    if (from.length === 2 && typeof name === 'string' && name in NATIVE) {
      found.push([name, value as Value])
    }
    for (const each of from) {
      declared(each, found)
    }
  } else if (typeof from === 'object' && from !== null) {
    for (const each of Object.values(from)) {
      declared(each, found)
    }
  }
  return found
}

/** Each family's forms, as `helix system components` writes them. */
const FAMILIES = new URL('../families', import.meta.url).pathname
const forms = readdirSync(FAMILIES).flatMap((family) => {
  const path = join(FAMILIES, family, 'index.native.ts')
  try {
    return [...readFileSync(path, 'utf8').matchAll(/^const \w+: Family = (\{.*\})\s*$/gm)].map(
      (form) => [family, JSON.parse(form[1] as string)] as const,
    )
  } catch {
    return []
  }
})

describe('a property a view reads as a number', () => {
  test.each([
    ['0.5', 0.5],
    ['50%', 0.5],
    ['1', 1],
  ])('an opacity written as %p is a number', (written, amount) => {
    expect(drawn([['opacity', { text: written }]]).opacity).toBe(amount)
  })

  test('an opacity a hook gives as words is a number', () => {
    const set: Declaration[] = [
      ['opacity', { hook: { fallback: { number: 0.5 }, name: 'disabled-opacity' } }],
    ]
    expect(drawn(set).opacity).toBe(0.5)
    expect(drawn(set, { 'disabled-opacity': '0.25' }).opacity).toBe(0.25)
  })

  test('a grow and a shrink written as words are numbers', () => {
    const out = drawn([
      ['flex-grow', { text: '1' }],
      ['flex-shrink', { text: '0' }],
    ])
    expect(out.flexGrow).toBe(1)
    expect(out.flexShrink).toBe(0)
  })

  test('what is not a number is named, and draws nothing', () => {
    const { dropped, style: out } = style(one([['opacity', { text: 'half' }]]), 'mark', {
      conditions: {},
      tokens: {},
    })
    expect((out as Record<string, unknown>).opacity).toBeUndefined()
    expect(dropped.join()).toContain('not a number')
  })

  test('every declaration of every family draws a number', () => {
    expect(forms.length).toBeGreaterThan(70)
    const words: string[] = []
    for (const [family, form] of forms) {
      for (const [name, value] of declared(form.rules)) {
        const amount = drawn([[name, value]])[NATIVE[name] as string]
        if (amount !== undefined && typeof amount !== 'number') {
          words.push(`${family} ${name}: ${JSON.stringify(amount)}`)
        }
      }
    }
    expect(words).toEqual([])
  })
})
