import { describe, expect, test } from 'bun:test'
import type { Declaration, Family, Rule } from './form.js'
import { wordsOf } from './mapping.js'
import { style } from './style.js'
import { withVariables } from './variables.js'

const tokens = { 'space-md': '1rem', 'space-xs': '0.25rem' }

/** A family of one part, `box`, with `set` declared on it. */
const one = (set: readonly Declaration[]): Family => ({
  name: 'card',
  rules: [
    {
      kind: 'rule',
      order: 0,
      set,
      specificity: [0, 1, 0],
      target: 'box',
      values: [],
      webOnly: false,
      when: [],
    } as Rule,
  ],
  tag: 'helix-card',
  tree: [{ kind: 'box', name: 'box' }],
  version: '2.0',
})

/** The style `property`, read from the hook `padding`, takes from `hooked`. */
const hooked = (property: string, written: string, custom: Record<string, string> = {}) =>
  style(one([[property, { hook: { name: 'padding' } }]]), 'box', {
    conditions: {},
    custom,
    hooks: { padding: written },
    tokens,
  })

describe('margin and padding from words', () => {
  test('one to four lengths, clockwise from the top, as CSS reads them', () => {
    expect(hooked('padding', '1rem').style).toEqual({ padding: 16 })
    expect(hooked('padding', '1rem 2rem').style).toEqual({
      paddingBottom: 16,
      paddingEnd: 32,
      paddingStart: 32,
      paddingTop: 16,
    })
    expect(hooked('padding', '1rem 2rem 3rem').style).toEqual({
      paddingBottom: 48,
      paddingEnd: 32,
      paddingStart: 32,
      paddingTop: 16,
    })
    const four = hooked('margin', '1rem 2rem 3rem 4rem')
    expect(four.style).toEqual({
      marginBottom: 48,
      marginEnd: 32,
      marginStart: 64,
      marginTop: 16,
    })
    expect(four.dropped).toEqual([])
  })

  test('a calc() or a var() with spaces in it is one length', () => {
    const { dropped, style: out } = hooked(
      'padding',
      'calc(1rem + var(--helix-space-xs)) var(--helix-space-md) calc( 2rem - 4px ) 0',
    )
    expect(out).toEqual({ paddingBottom: 28, paddingEnd: 16, paddingStart: 0, paddingTop: 20 })
    expect(dropped).toEqual([])
  })

  test('a hook that names a custom property set to words reads those words', () => {
    const { style: out } = hooked('padding', 'var(--hero-padding)', {
      'hero-padding': '1rem 2rem 3rem 4rem',
    })
    expect(out).toEqual({ paddingBottom: 48, paddingEnd: 32, paddingStart: 64, paddingTop: 16 })
  })

  test('an axis takes one or two lengths, its two ends', () => {
    expect(hooked('padding-block', '1rem').style).toEqual({ paddingVertical: 16 })
    expect(hooked('padding-block', '1rem 2rem').style).toEqual({
      paddingBottom: 32,
      paddingTop: 16,
    })
    expect(hooked('padding-inline', 'var(--helix-space-xs) calc(1rem + 2px)').style).toEqual({
      paddingEnd: 18,
      paddingStart: 4,
    })
    expect(hooked('margin-inline', '1rem').style).toEqual({ marginEnd: 16, marginStart: 16 })
    expect(hooked('margin-block', '1rem 2rem').style).toEqual({ marginBottom: 32, marginTop: 16 })
  })

  test('more lengths than the property takes, or a word that is no length, are dropped', () => {
    expect(hooked('padding', '1rem 2rem 3rem 4rem 5rem').dropped).toEqual([
      'padding: not one to four lengths',
    ])
    expect(hooked('padding-block', '1rem 2rem 3rem').dropped).toEqual([
      'padding-block: not one or two lengths',
    ])
    expect(hooked('padding', '1rem var(--unset)').dropped).toEqual([
      'padding: not one to four lengths',
    ])
  })
})

describe('wordsOf', () => {
  test('splits only at the spaces outside parentheses', () => {
    expect(wordsOf('calc(1rem + var(--x)) 2rem')).toEqual(['calc(1rem + var(--x))', '2rem'])
    expect(wordsOf(' calc((1rem + 2rem) * 2)  max(1px, 2px) ')).toEqual([
      'calc((1rem + 2rem) * 2)',
      'max(1px, 2px)',
    ])
    expect(wordsOf(['1rem', 2])).toEqual(['1rem', 2])
  })
})

describe('withVariables', () => {
  const set: Readonly<Record<string, unknown>> = { a: '1rem', list: ['1px', '2px'], n: 4 }
  const at = (name: string) => set[name]
  test('reads each var(), innermost first, its fallback where it has no value', () => {
    expect(withVariables('var(--a) var(--n)', at)).toBe('1rem 4')
    expect(withVariables('var(--b, var(--a))', at)).toBe('1rem')
    expect(withVariables('var(--b, 2rem) var(--list)', at)).toBe('2rem 1px 2px')
  })
  test('leaves the words as they are where a reference has neither', () => {
    expect(withVariables('1rem var(--b)', () => undefined)).toBe('1rem var(--b)')
  })
  test('stops at a property that names itself', () => {
    expect(withVariables('var(--a)', () => 'var(--a)')).toBe('var(--a)')
  })
})
