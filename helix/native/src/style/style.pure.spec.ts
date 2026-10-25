import { describe, expect, test } from 'bun:test'
import type { Family, Rule } from './form.js'
import { family, indicator, lengths, row, rule, strip, tokens } from './style.fixtures.js'
import { style } from './style.js'

describe('style', () => {
  test('a border expands, a rem becomes points, and a web-only value is named', () => {
    const { dropped, style: resolved } = style(family, 'button', { conditions: {}, tokens })
    expect(resolved).toMatchObject({ borderStyle: 'solid', borderWidth: 1, paddingHorizontal: 12 })
    expect(dropped).toContain('cursor: web only')
  })

  /* The default size; 1.353, the largest of iOS's standard sizes, where space
     stops growing; and 3.571, the largest of iOS's accessibility sizes. */
  test.each([1, 1.353, 3.571])(
    'at %p, text takes the whole text size, space stops at 1.353, and calc() resolves by term',
    (size) => {
      const rem = 16 * size
      const spaceRem = 16 * Math.min(size, 1.353)
      const heading: Family = {
        name: 'heading',
        rules: [
          rule({
            order: 0,
            set: [
              ['font-size', { text: '1.5rem' }],
              ['letter-spacing', { text: '-0.01em' }],
              ['line-height', { token: 'leading-heading' }],
              ['padding', { text: '1rem' }],
              ['gap', { text: '0.5em' }],
              [
                'border-radius',
                { calc: { op: '-', operands: [{ text: '0.5rem' }, { text: '1px' }] } },
              ],
              [
                'min-block-size',
                {
                  calc: {
                    op: '*',
                    operands: [
                      { calc: { op: '+', operands: [{ text: '1rem' }, { text: '0.5em' }] } },
                      { number: 2 },
                    ],
                  },
                },
              ],
            ],
            specificity: [0, 1, 0],
            target: 'host',
          }),
        ],
        tag: 'helix-heading',
        version: '1.0',
      }
      const { dropped, style: drawn } = style(heading, 'host', {
        conditions: {},
        rem,
        spaceRem,
        tokens: { 'leading-heading': 'calc(0.99em + 0.5rem)' },
      })
      const near = (value: number) => Math.round(value * 100) / 100
      expect(dropped).toEqual([])
      expect(drawn.fontSize).toBe(near(24 * size))
      expect(drawn.lineHeight).toBe(near(0.99 * 24 * size + 8 * size))
      expect(drawn.letterSpacing).toBe(near(-0.24 * size))
      expect(drawn.padding).toBe(near(spaceRem))
      /* An em in space is the font size at the space's rem: 24 points at the default. */
      expect(drawn.gap).toBe(near(0.5 * 1.5 * spaceRem))
      expect(drawn.borderRadius).toBe(near(0.5 * spaceRem - 1))
      expect(drawn.minHeight).toBe(near(2 * (spaceRem + 0.5 * 1.5 * spaceRem)))
    },
  )

  test.each([1, 1.353, 3.571])(
    'at %p, a height in rems is a height up to 1.353 and the least height past it',
    (size) => {
      const control: Family = {
        name: 'control',
        rules: [
          rule({
            order: 0,
            set: [
              ['block-size', { text: '2.5rem' }],
              ['inline-size', { text: '2.5rem' }],
            ],
            specificity: [0, 1, 0],
            target: 'host',
          }),
          rule({
            order: 1,
            set: [['block-size', { text: '3px' }]],
            specificity: [0, 1, 0],
            target: 'mark',
          }),
        ],
        tag: 'helix-control',
        tree: [{ kind: 'box', name: 'mark' }],
        version: '1.0',
      }
      const context = {
        conditions: {},
        rem: 16 * size,
        spaceRem: 16 * Math.min(size, 1.353),
        tokens: {},
      }
      const { style: host } = style(control, 'host', context)
      const space = Math.round(40 * Math.min(size, 1.353) * 100) / 100
      expect(host.width).toBe(space)
      expect(size > 1.353 ? host.minHeight : host.height).toBe(space)
      expect(size > 1.353 ? host.height : host.minHeight).toBeUndefined()
      expect(style(control, 'mark', context).style.height).toBe(3)
    },
  )

  test('currentColor is the inherited text color, resolved before a mix reads it', () => {
    const ring: Family = {
      name: 'button',
      rules: [
        rule({
          order: 0,
          set: [
            [
              'border-color',
              {
                mix: {
                  first: { text: 'currentColor' },
                  percent: 30,
                  second: { text: 'transparent' },
                },
              },
            ],
          ],
          specificity: [0, 1, 0],
          target: 'spinner',
        }),
      ],
      tag: 'helix-button',
      version: '1.0',
    }
    expect(
      style(ring, 'spinner', { conditions: {}, currentColor: '#ffffff', tokens }).style.borderColor,
    ).toBe('rgba(255, 255, 255, 0.3)')
  })

  test('a measured length and a private one add up, and right to left sets the private one', () => {
    const at = (dir: 'ltr' | 'rtl') =>
      style(indicator, 'indicator', {
        conditions: {},
        dir,
        measured: { 'indicator-x': 40 },
        tokens,
      }).style.width
    expect(at('ltr')).toBe(40)
    expect(at('rtl')).toBe(44)
    expect(style(indicator, 'indicator', { conditions: {}, tokens }).style.width).toBe(0)
  })

  test("the host's rules for its children are theirs, and never the host's own", () => {
    const host = style(indicator, 'host', { conditions: {}, tokens })
    expect(host.children).toEqual({
      'helix-tab': {
        counting: { increment: {}, reset: {}, set: {} },
        custom: {},
        style: { margin: 0 },
        values: {},
      },
    })
    expect(host.style.margin).toBeUndefined()
  })

  test('a value set on a part reaches the parts inside it, and never the ones beside it', () => {
    expect(style(strip, 'indicator', { conditions: {}, tokens }).style.backgroundColor).toBe(
      '#eeeeee',
    )
    expect(style(strip, 'panels', { conditions: {}, tokens }).style.backgroundColor).toBe('#ffffff')
    expect(style(strip, 'tabs', { conditions: {}, tokens }).values.surface).toBe('#eeeeee')
  })

  test('a value from the element around wins over a fallback, and initial falls back', () => {
    const inside = (surface: string) =>
      style(
        {
          name: 'tabs-tab',
          rules: [strip.rules[4] as Rule],
          tag: 'helix-tab',
          version: '1.0',
        },
        'panels',
        {
          conditions: {},
          inherited: { surface },
          tokens,
        },
      ).style.backgroundColor
    expect(inside('#123456')).toBe('#123456')
    expect(inside('initial')).toBe('#000000')
  })

  test('a one-color gradient sized to an edge is a line along it', () => {
    expect(style(strip, 'tabs', { conditions: {}, tokens }).rule).toBeUndefined()
    expect(style(strip, 'tabs', { conditions: { variant: 'underlined' }, tokens }).rule).toEqual({
      color: '#cccccc',
      edge: 'bottom',
      thickness: 1,
    })
  })

  test('a grid of rows is a column, and a transition moves the properties it names', () => {
    expect(style(strip, 'host', { conditions: {}, tokens }).style).toMatchObject({
      display: 'flex',
      flexDirection: 'column',
    })
    const { transitions } = style(strip, 'indicator', { conditions: {}, tokens })
    expect(transitions).toEqual({
      opacity: { duration: 120, easing: 'linear' },
      translateX: { duration: 200, easing: 'ease' },
      translateY: { duration: 200, easing: 'ease' },
    })
    expect(
      style(strip, 'indicator', { conditions: {}, reducedMotion: true, tokens }).transitions.opacity
        ?.duration,
    ).toBe(0)
  })

  test('an inline box shrinks to its content in block flow, and stretches in a flex line', () => {
    expect(style(lengths, 'host', { conditions: {}, tokens }).style.alignSelf).toBe('flex-start')
    expect(
      style(lengths, 'host', { conditions: {}, tokens, within: row }).style.alignSelf,
    ).toBeUndefined()
  })

  test('a full length stretches across its line, and grows along it only where the parent fills', () => {
    /* The host shrinks to its content, so the press is its content's length. */
    expect(style(lengths, 'tab', { conditions: {}, tokens }).style).toMatchObject({
      alignSelf: 'stretch',
    })
    expect(style(lengths, 'tab', { conditions: {}, tokens }).style.flexGrow).toBeUndefined()
    /* Along a row, the host is its content's length, so the press is too. */
    expect(
      style(lengths, 'tab', { conditions: {}, tokens, within: row }).style.flexGrow,
    ).toBeUndefined()
    /* Unless the element around makes the host grow, as a full-width tab set
       does each tab, and then the press grows with it. */
    expect(
      style(lengths, 'tab', { conditions: {}, given: { flex: 1 }, tokens, within: row }).style
        .flexGrow,
    ).toBe(1)
    /* Down a column the host stretches across it, so the press grows into it. */
    expect(
      style(lengths, 'tab', {
        conditions: {},
        tokens,
        within: { flex: true, row: false, tracks: [] },
      }).style,
    ).toMatchObject({ alignSelf: 'stretch', flexGrow: 1 })
  })

  test("a grid's 1fr track grows, and its auto one keeps its content's size", () => {
    const beside: Family = {
      name: 'tabs',
      rules: [
        rule({
          order: 0,
          set: [
            ['display', { text: 'grid' }],
            ['grid-template-columns', { text: 'auto minmax(0, 1fr)' }],
          ],
          specificity: [0, 1, 0],
          target: 'host',
        }),
      ],
      tag: 'helix-tabs',
      tree: [
        { kind: 'box', name: 'tabs' },
        { kind: 'box', name: 'panels' },
      ],
      version: '1.0',
    }
    expect(style(beside, 'host', { conditions: {}, tokens }).style.flexDirection).toBe('row')
    expect(style(beside, 'panels', { conditions: {}, tokens }).style).toMatchObject({
      flexGrow: 1,
      flexShrink: 1,
    })
    expect(style(beside, 'tabs', { conditions: {}, tokens }).style.flexGrow).toBeUndefined()
  })

  test('an animation resolves to its keyframes, and reduced motion slows it', () => {
    const spinner: Family = {
      name: 'button',
      rules: [
        rule({
          order: 0,
          specificity: [0, 1, 0],
          target: 'host',
          values: [['turn', { text: '0.8s' }]],
        }),
        rule({
          order: 1,
          set: [
            [
              'animation',
              {
                space: [
                  { text: 'helix-button-turn' },
                  { hook: { fallback: { own: { name: 'turn' } }, name: 'spinner-duration' } },
                  { text: 'linear' },
                  { text: 'infinite' },
                ],
              },
            ],
          ],
          specificity: [0, 1, 0],
          target: 'spinner',
        }),
        {
          frames: [['to', [['rotate', { text: '1turn' }]]]],
          kind: 'keyframes',
          name: 'helix-button-turn',
        },
        rule({
          order: 3,
          set: [['animation-duration', { text: '4s' }]],
          specificity: [0, 1, 0],
          target: 'spinner',
          when: [{ kind: 'media', query: '(prefers-reduced-motion: reduce)' }],
        }),
      ],
      tag: 'helix-button',
      version: '1.0',
    }
    expect(style(spinner, 'spinner', { conditions: {}, tokens }).motion).toEqual({
      delay: 0,
      direction: 'normal',
      duration: 800,
      easing: 'linear',
      fill: 'none',
      frames: [['to', { rotate: '1turn' }]],
      iterations: Number.POSITIVE_INFINITY,
      keyframes: { to: { rotate: '360deg' } },
      name: 'helix-button-turn',
      paused: false,
    })
    expect(
      style(spinner, 'spinner', { conditions: {}, reducedMotion: true, tokens }).motion?.duration,
    ).toBe(4000)
  })
})
