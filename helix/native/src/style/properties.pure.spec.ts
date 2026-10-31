import { describe, expect, test } from 'bun:test'
import type { Declaration, Family, Keyframes, Rule } from './form.js'
import { style } from './style.js'
import { parseTransform, stepsOf } from './transforms.js'

const tokens = {
  'border-thick': '2px',
  'color-background': '#ffffff',
  'color-foreground': '#000000',
  'space-sm': '0.5rem',
}

/** A family of one part, `mark`, with `set` declared on it and `frames` as its keyframes. */
const one = (set: readonly Declaration[], frames: readonly Keyframes[] = []): Family => ({
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
    ...frames,
  ],
  tag: 'helix-mark',
  tree: [{ kind: 'box', name: 'mark' }],
  version: '2.0',
})

/** The style `set` resolves to, and what it drops. */
const drawn = (...set: Declaration[]) => style(one(set), 'mark', { conditions: {}, tokens })

const text = (value: string) => ({ text: value })
const space = (...values: (number | string)[]) => ({
  space: values.map((value) => (typeof value === 'number' ? { number: value } : text(value))),
})

describe('transforms', () => {
  test('a scale, a rotation, and a translate in percentages are the parts of a transform', () => {
    const { dropped, style: out } = drawn(
      ['scale', space(0.5, 1)],
      ['rotate', text('-90deg')],
      ['translate', space('-50%', '0.5rem')],
    )
    expect(out).toEqual({
      rotate: '-90deg',
      scaleX: 0.5,
      scaleY: 1,
      translateX: '-50%',
      translateY: 8,
    })
    expect(dropped).toEqual([])
    expect(stepsOf(out)).toEqual([
      { translateX: '-50%' },
      { translateY: 8 },
      { rotate: '-90deg' },
      { scaleX: 0.5 },
      { scaleY: 1 },
    ])
  })

  test('a transform list resolves its lengths, and composes after the individual properties', () => {
    const { style: out } = drawn(
      ['transform', { function: { arguments: [text('-30%')], name: 'translateY' } }],
      ['scale', { number: 1.18 }],
    )
    expect(out).toEqual({ scaleX: 1.18, scaleY: 1.18, transform: 'translateY(-30%)' })
    expect(stepsOf(out)).toEqual([{ scaleX: 1.18 }, { scaleY: 1.18 }, { translateY: '-30%' }])
    expect(
      parseTransform('translate(1rem, 50%) rotate(0.25turn)', (length) =>
        length === '1rem' ? 16 : length,
      ),
    ).toEqual([{ translateX: 16 }, { translateY: '50%' }, { rotate: '90deg' }])
  })

  test('a 3D function or a rotation about an axis is dropped and named', () => {
    expect(drawn(['transform', text('rotate3d(1, 0, 0, 45deg)')]).dropped).toEqual([
      'transform: a function with no native equivalent yet',
    ])
    expect(drawn(['rotate', text('x 45deg')]).dropped).toEqual([
      'rotate: a rotation about an axis has no native equivalent yet',
    ])
  })

  test('a transform origin keeps its keywords and writes its lengths in points', () => {
    expect(drawn(['transform-origin', space('left', '0.5rem')]).style).toEqual({
      transformOrigin: 'left 8px',
    })
  })
})

describe('shadows', () => {
  test('a list keeps each shadow, an inset, a spread, and lengths in points', () => {
    const { style: out } = drawn([
      'box-shadow',
      {
        list: [
          {
            space: [
              { number: 0 },
              { number: 0 },
              { number: 0 },
              { token: 'border-thick' },
              { token: 'color-background' },
            ],
          },
          {
            space: [
              text('inset'),
              { number: 0 },
              text('0.125rem'),
              text('0.25rem'),
              text('rgba(0, 0, 0, 0.2)'),
            ],
          },
        ],
      },
    ])
    expect(out.boxShadow).toBe('0px 0px 0px 2px #ffffff, inset 0px 2px 4px rgba(0, 0, 0, 0.2)')
  })
})

describe('text', () => {
  test('nowrap is one line, an ellipsis ends it, and a clamp is a number of lines', () => {
    expect(
      drawn(['white-space', text('nowrap')], ['text-overflow', text('ellipsis')]).style,
    ).toEqual({
      ellipsizeMode: 'tail',
      numberOfLines: 1,
    })
    expect(drawn(['line-clamp', { number: 3 }]).style).toEqual({
      ellipsizeMode: 'tail',
      numberOfLines: 3,
    })
    expect(drawn(['text-wrap', text('balance')]).style).toEqual({
      lineBreakStrategyIOS: 'standard',
      textBreakStrategy: 'balanced',
    })
  })

  test('the font’s style and its variants are what a text takes', () => {
    expect(
      drawn(
        ['font-style', text('italic')],
        ['font-variant-numeric', text('tabular-nums')],
        ['font-variant-ligatures', text('none')],
        ['text-align', text('end')],
        ['text-transform', text('uppercase')],
      ).style,
    ).toEqual({
      fontStyle: 'italic',
      fontVariant: 'tabular-nums no-common-ligatures no-contextual',
      textAlign: 'right',
      textTransform: 'uppercase',
    })
    expect(drawn(['font-feature-settings', text('"tnum" 1, "calt" 0')]).style).toEqual({
      fontVariant: 'tabular-nums no-contextual',
    })
  })
})

describe('layout', () => {
  test('a three-value flex is a grow, a shrink, and a basis', () => {
    expect(drawn(['flex', space(1, 1, 0)]).style).toEqual({
      flexBasis: 0,
      flexGrow: 1,
      flexShrink: 1,
    })
    expect(drawn(['flex', space(0, 0, 'auto')]).style).toEqual({ flexGrow: 0, flexShrink: 0 })
    expect(drawn(['flex', { number: 1 }]).style).toEqual({ flex: 1 })
  })

  test('gaps, a wrap, a block margin, an inset block, a ratio, and a self alignment', () => {
    expect(
      drawn(
        ['row-gap', { token: 'space-sm' }],
        ['column-gap', text('4px')],
        ['flex-wrap', text('wrap')],
        ['margin-block', space('0.5rem', 0)],
        ['inset-block', { number: 0 }],
        ['aspect-ratio', text('16 / 9')],
        ['justify-self', text('end')],
        ['align-content', text('start')],
        ['pointer-events', text('none')],
      ).style,
    ).toEqual({
      alignContent: 'flex-start',
      alignSelf: 'flex-end',
      aspectRatio: 16 / 9,
      bottom: 0,
      columnGap: 4,
      flexWrap: 'wrap',
      marginBottom: 0,
      marginTop: 8,
      pointerEvents: 'none',
      rowGap: 8,
      top: 0,
    })
  })

  test('a box can pass touches to what it holds', () => {
    expect(drawn(['pointer-events', text('box-none')]).style).toEqual({ pointerEvents: 'box-none' })
  })

  test('a hidden or clipped overflow clips', () => {
    expect(drawn(['overflow', text('hidden')]).style).toEqual({ overflow: 'hidden' })
    expect(drawn(['overflow-x', text('clip')]).style).toEqual({ overflow: 'hidden' })
  })
})

describe('edges', () => {
  test('a width, a style, and a color in any order, and none without a style', () => {
    expect(drawn(['border-inline-start', space('solid', '#cccccc', '1px')]).style).toEqual({
      borderStartColor: '#cccccc',
      borderStartWidth: 1,
      borderStyle: 'solid',
    })
    expect(drawn(['border', { number: 0 }]).style).toEqual({ borderWidth: 0 })
    expect(drawn(['border-width', space(1, 2)]).style).toEqual({
      borderBottomWidth: 1,
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 1,
    })
  })

  test('a radius written after the corners sets every corner, as the shorthand does', () => {
    expect(
      drawn(['border-start-start-radius', text('4px')], ['border-radius', text('9999px')]).style,
    ).toEqual({ borderRadius: 9999 })
    expect(
      drawn(['border-radius', text('9999px')], ['border-start-start-radius', text('4px')]).style,
    ).toEqual({ borderRadius: 9999, borderTopStartRadius: 4 })
  })
})

describe('paint and backgrounds', () => {
  test('a shape’s stroke, its dashes, and its offset', () => {
    expect(
      drawn(
        ['fill', text('none')],
        ['stroke', text('currentColor')],
        ['stroke-width', { number: 8 }],
        ['stroke-dasharray', space(70, 100)],
        ['stroke-dashoffset', { number: -25 }],
        ['stroke-linecap', text('round')],
      ).style,
    ).toEqual({
      fill: 'none',
      stroke: '#000000',
      strokeDasharray: '70 100',
      strokeDashoffset: -25,
      strokeLinecap: 'round',
      strokeWidth: 8,
    })
  })

  test('dashes separated by a comma, as a loader’s arc writes them', () => {
    expect(drawn(['stroke-dasharray', text('50, 100')]).style).toEqual({
      strokeDasharray: '50 100',
    })
  })

  test('a one-color gradient a length places is a line that far in from its edge', () => {
    const color = { text: '#cccccc' }
    const placed = (size: (number | string)[], position: (number | string)[]) =>
      style(
        one([
          [
            'background-image',
            { function: { arguments: [color, color], name: 'linear-gradient' } },
          ],
          ['background-size', space(...size)],
          ['background-position', space(...position)],
        ]),
        'mark',
        { conditions: {}, tokens },
      ).rule
    expect(placed(['1px', '100%'], ['3px', 0])).toEqual({
      color: '#cccccc',
      edge: 'left',
      inset: 3,
      thickness: 1,
    })
    expect(placed(['100%', '2px'], [0, '0.5rem'])).toEqual({
      color: '#cccccc',
      edge: 'top',
      inset: 8,
      thickness: 2,
    })
  })

  test('a gradient that is no edge line is the background image, in points', () => {
    const gradient = {
      function: {
        arguments: [text('to right'), space('#000000', '0.5rem'), space('transparent', '0.5rem')],
        name: 'linear-gradient',
      },
    }
    expect(
      drawn(['background-image', gradient], ['background-size', space('200%', '100%')]).style,
    ).toEqual({
      backgroundImage: 'linear-gradient(to right, #000000 8px, transparent 8px)',
      backgroundSize: '200% 100%',
    })
  })
})

describe('generated boxes', () => {
  test('an empty `::before` and an `::after` each draw a box, and `none` draws nothing', () => {
    const family: Family = {
      ...one([]),
      rules: [
        {
          ...(one([]).rules[0] as Rule),
          inner: '::before',
          set: [
            ['content', text('""')],
            ['inline-size', { number: 8 }],
          ],
        },
        {
          ...(one([]).rules[0] as Rule),
          inner: '::after',
          order: 1,
          set: [
            ['content', text('"3"')],
            ['position', text('absolute')],
          ],
        },
      ],
    }
    const { generated } = style(family, 'mark', { conditions: {}, tokens })
    expect(generated).toEqual({
      after: { style: { position: 'absolute' }, transitions: {}, words: '3' },
      before: { style: { width: 8 }, transitions: {} },
    })
    const gone: Family = {
      ...family,
      rules: [{ ...(family.rules[1] as Rule), set: [['content', text('none')]] }],
    }
    expect(style(gone, 'mark', { conditions: {}, tokens }).generated).toBeUndefined()
  })
})

describe('motion', () => {
  test('a shorthand in any order, its longhands over it, and each frame as a style', () => {
    const family = one(
      [
        ['animation', space('pulse', 'infinite', 'ease-in-out', '1.5s', '0.2s', 'alternate')],
        ['animation-iteration-count', { number: 2 }],
      ],
      [
        {
          frames: [
            [
              '50%',
              [
                ['opacity', { number: 0.4 }],
                ['scale', { number: 1.1 }],
              ],
            ],
          ],
          kind: 'keyframes',
          name: 'pulse',
        },
      ],
    )
    expect(style(family, 'mark', { conditions: {}, tokens }).motion).toMatchObject({
      delay: 200,
      direction: 'alternate',
      duration: 1500,
      easing: 'ease-in-out',
      iterations: 2,
      keyframes: { '50%': { opacity: 0.4, scaleX: 1.1, scaleY: 1.1 } },
    })
  })

  test('a duration token is milliseconds, and a transition names its delay', () => {
    const { transitions } = drawn([
      'transition',
      space('scale', 200, 'cubic-bezier(0.3, 0, 0, 1.2)', '50ms'),
    ])
    expect(transitions).toEqual({
      scaleX: { delay: 50, duration: 200, easing: 'cubic-bezier(0.3, 0, 0, 1.2)' },
      scaleY: { delay: 50, duration: 200, easing: 'cubic-bezier(0.3, 0, 0, 1.2)' },
    })
  })
})
