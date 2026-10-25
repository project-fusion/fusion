import { describe, expect, test } from 'bun:test'
import type { Condition, Family } from './form.js'
import { rule, tokens } from './style.fixtures.js'
import { style } from './style.js'

/** A family with one rule on `time`, coloring it red under `when`. */
const under = (...when: Condition[]): Family => ({
  name: 'timeline-item',
  rules: [
    rule({
      order: 0,
      set: [['color', { text: '#ff0000' }]],
      specificity: [0, 2, 0],
      target: 'time',
      when,
    }),
  ],
  tag: 'helix-timeline-item',
  version: '1.0',
})

const red = (family: Family, context: Partial<Parameters<typeof style>[2]>): boolean =>
  style(family, 'time', { conditions: {}, tokens, ...context }).style.color === '#ff0000'

describe('style, the conditions wave 2 reads', () => {
  test('an even or odd place counts the host among its siblings from one', () => {
    const even = under({ kind: 'host-place', place: 'even' })
    expect(red(even, { place: { first: false, index: 2, last: false } })).toBe(true)
    expect(red(even, { place: { first: true, index: 1, last: false } })).toBe(false)
    expect(red(even, { place: { first: false, last: false } })).toBe(false)
    const odd = under({ kind: 'host-place', place: 'odd' })
    expect(red(odd, { place: { first: true, index: 1, last: true } })).toBe(true)
  })

  test('a part that is drawn holds where the tree draws it', () => {
    const icon = under({ kind: 'holds', names: [], part: 'icon' })
    expect(red(icon, { drawn: ['icon', 'time'] })).toBe(true)
    expect(red(icon, { drawn: ['time'] })).toBe(false)
    const none = under({ condition: { kind: 'holds', names: [], part: 'icon' }, kind: 'not' })
    expect(red(none, { drawn: ['time'] })).toBe(true)
  })

  test('a region holds what is passed into it, and an entering part its first values', () => {
    expect(red(under({ kind: 'filled', region: 'label' }), { filled: ['label'] })).toBe(true)
    expect(red(under({ kind: 'filled', region: 'label' }), { filled: [] })).toBe(false)
    expect(red(under({ kind: 'entering' }), { entering: true })).toBe(true)
    expect(red(under({ kind: 'entering' }), {})).toBe(false)
  })

  test('a finger cannot hover and is a coarse pointer', () => {
    expect(red(under({ kind: 'media', query: '(hover: none)' }), {})).toBe(true)
    expect(red(under({ kind: 'media', query: '(pointer: coarse)' }), {})).toBe(true)
  })
})
