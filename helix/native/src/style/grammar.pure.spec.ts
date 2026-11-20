import { describe, expect, test } from 'bun:test'
import type { Context } from './context.js'
import type { Family, Rule } from './form.js'
import { style } from './style.js'

/* The targets, conditions and hooks wave 1 added to the grammar, as a native
   view reads them. */

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

const tokens = { 'color-danger': '#ff0000', 'color-foreground': '#000000', 'space-xs': '4px' }

const context = (fields: Partial<Context> = {}): Context => ({ conditions: {}, tokens, ...fields })

const of = (rules: Rule[], tree: Family['tree'] = []): Family => ({
  name: 'stat',
  rules,
  tag: 'helix-stat',
  tree,
  version: '2.0',
})

describe('conditions', () => {
  test('a value a prop does not take, and any of several', () => {
    const family = of([
      rule({
        order: 0,
        set: [['opacity', { number: 0.5 }]],
        specificity: [0, 2, 0],
        target: 'host',
        when: [
          {
            condition: { kind: 'attribute', name: 'emphasis', value: 'solid' },
            kind: 'not',
          },
        ],
      }),
      rule({
        order: 1,
        set: [['margin', { text: '4px' }]],
        specificity: [0, 2, 0],
        target: 'host',
        when: [{ kind: 'one-of', name: 'separation', values: ['filled', 'outlined'] }],
      }),
    ])
    const at = (conditions: Context['conditions']) => style(family, 'host', context({ conditions }))
    expect(at({ emphasis: 'solid' }).style.opacity).toBeUndefined()
    expect(at({ emphasis: 'ghost' }).style.opacity).toBe(0.5)
    expect(at({ separation: 'filled' }).style.margin).toBe(4)
    expect(at({ separation: 'plain' }).style.margin).toBeUndefined()
  })

  test('an upgraded element, a motion preference, and the host and a child among siblings', () => {
    const family = of([
      rule({
        order: 0,
        set: [['opacity', { number: 0.25 }]],
        specificity: [0, 2, 0],
        target: 'host',
        when: [{ kind: 'defined' }],
      }),
      rule({
        order: 1,
        set: [['margin', { text: '2px' }]],
        specificity: [0, 1, 0],
        target: 'host',
        when: [{ kind: 'media', query: '(prefers-reduced-motion: no-preference)' }],
      }),
      rule({
        order: 2,
        set: [['padding', { text: '8px' }]],
        specificity: [0, 2, 0],
        target: 'host',
        when: [{ kind: 'host-place', place: 'first' }],
      }),
      rule({
        order: 3,
        set: [['margin', { text: '0px' }]],
        slotted: '*',
        specificity: [0, 1, 1],
        target: 'host',
        when: [{ condition: { kind: 'place', place: 'last' }, kind: 'not' }],
      }),
      rule({
        order: 4,
        set: [['z-index', { number: 1 }]],
        slotted: '*',
        specificity: [0, 1, 1],
        target: 'host',
        when: [{ kind: 'pseudo', names: ['focus-within'] }],
      }),
    ])
    const host = style(family, 'host', context({ place: { first: true, last: false } }))
    expect(host.style.opacity).toBe(0.25)
    expect(host.style.margin).toBe(2)
    expect(host.style.padding).toBe(8)
    expect(style(family, 'host', context({ reducedMotion: true })).style.margin).toBeUndefined()
    expect(style(family, 'host', context()).style.padding).toBeUndefined()
    /* Every child but the last, and never a child's own focus, which the
       element around does not hear. */
    const earlier = style(family, 'host', context({ child: 'first', last: false }))
    expect(earlier.children['*']?.style).toEqual({ margin: 0 })
    const last = style(family, 'host', context({ child: 'later', last: true }))
    expect(last.children['*']).toBeUndefined()
    const focused = context({ child: 'later', conditions: { focusWithin: true }, last: true })
    expect(style(family, 'host', focused).children['*']).toBeUndefined()
  })
})

describe('regions', () => {
  test('a rule on a region is its content’s, under the parts the region sits in', () => {
    const family = of(
      [
        rule({
          order: 0,
          region: 'label',
          set: [['color', { token: 'color-danger' }]],
          specificity: [0, 1, 1],
          target: 'host',
        }),
        rule({
          order: 1,
          region: '*',
          set: [['margin', { text: '0px' }]],
          slotted: '*',
          specificity: [0, 1, 2],
          target: 'host',
          when: [{ kind: 'within', part: 'value' }],
        }),
      ],
      [
        { children: [{ kind: 'region', name: 'unit' }], kind: 'box', name: 'value' },
        { kind: 'region', name: 'label' },
      ],
    )
    const host = style(family, 'host', context())
    expect(host.style.color).toBeUndefined()
    expect(host.contents.label).toEqual({ children: {}, custom: {}, style: { color: '#ff0000' } })
    expect(host.contents.unit?.children['*']?.style).toEqual({ margin: 0 })
    expect(style(family, 'value', context()).contents).toEqual({})
  })
})

describe('hooks', () => {
  test('a hook reads what the element sets for itself, under what the element around sets', () => {
    const family: Family = {
      ...of([
        rule({
          order: 0,
          set: [['--stat-gap', { token: 'space-xs' }]],
          specificity: [0, 2, 0],
          target: 'host',
          when: [{ kind: 'attribute', name: 'dense', value: null }],
        }),
        rule({
          order: 1,
          set: [
            ['gap', { hook: { fallback: { text: '8px' }, name: 'gap' } }],
            [
              'border-radius',
              { hook: { fallback: { text: '2px' }, name: 'radius', of: 'button' } },
            ],
            ['padding', { token: 'space-xs' }],
            ['color', { hook: { fallback: { keyword: 'initial' }, name: 'color' } }],
          ],
          specificity: [0, 1, 0],
          target: 'value',
        }),
        rule({
          order: 2,
          set: [['--helix-space-xs', { text: '6px' }]],
          specificity: [0, 2, 0],
          target: 'host',
          when: [{ kind: 'attribute', name: 'loose', value: null }],
        }),
      ]),
      tree: [{ kind: 'box', name: 'value' }],
    }
    const value = (fields: Partial<Context>) => style(family, 'value', context(fields)).style
    expect(value({}).gap).toBe(8)
    expect(value({ conditions: { dense: true } }).gap).toBe(4)
    expect(value({ conditions: { dense: true }, hooks: { gap: '12px' } }).gap).toBe(12)
    expect(value({ custom: { 'button-radius': '5px' } }).borderRadius).toBe(5)
    expect(value({}).borderRadius).toBe(2)
    expect(value({ conditions: { loose: true } }).padding).toBe(6)
    expect(value({}).color).toBeUndefined()
    expect(style(family, 'value', context({ conditions: { dense: true } })).custom).toEqual({
      'stat-gap': '4px',
    })
  })
})
