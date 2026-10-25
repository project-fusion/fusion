import { describe, expect, test } from 'bun:test'
import type { Declaration, Family, Rule } from './form.js'
import { style } from './style.js'
import { derive, quotationMark } from './values.js'

/** A family of one host rule that sets `set`, and one before the part that sets `content`. */
const family = (set: readonly Declaration[], content?: Declaration[1]): Family => ({
  name: 'b',
  rules: [
    {
      kind: 'rule',
      order: 0,
      set,
      specificity: [0, 1, 0],
      target: 'host',
      values: [],
      webOnly: false,
      when: [],
    },
    ...(content === undefined
      ? []
      : [
          {
            inner: '::before',
            kind: 'rule',
            order: 1,
            set: [['content', content]],
            specificity: [0, 1, 1],
            target: 'host',
            values: [],
            webOnly: false,
            when: [],
          } satisfies Rule,
        ]),
  ],
  tag: 'helix-b',
  version: '1.0',
})

const tokens = { 'color-border': '#cccccc', 'space-2xs': '0.25rem' }

describe('quotient', () => {
  test('divides a length by a number', () => {
    const drawn = style(
      family([
        [
          'padding-inline-start',
          { calc: { op: '/', operands: [{ token: 'space-2xs' }, { number: 2 }] } },
        ],
      ]),
      'host',
      { conditions: {}, tokens },
    )
    expect(drawn.style.paddingStart).toBe(2)
    expect(drawn.dropped).toEqual([])
  })

  /* A length over a length of the same unit is a number, as CSS's typed
     arithmetic has it, which a code fragment's size multiplies by an em. */
  test('divides a length by a length of the same unit into a ratio', () => {
    const ratio = {
      calc: { op: '/' as const, operands: [{ text: '0.8125rem' }, { text: '0.875rem' }] },
    }
    const drawn = style(
      family([['font-size', { calc: { op: '*', operands: [ratio, { text: '1em' }] } }]]),
      'host',
      { conditions: {}, fontSize: 14, tokens },
    )
    expect(drawn.style.fontSize).toBeCloseTo(13, 1)
  })

  test('leaves a quotient by a length of another unit, or by zero, unresolved', () => {
    for (const divisor of [{ text: '1rem' }, { number: 0 }]) {
      const drawn = style(
        family([
          ['padding-inline-start', { calc: { op: '/', operands: [{ text: '8px' }, divisor] } }],
        ]),
        'host',
        { conditions: {}, tokens },
      )
      expect(drawn.style.paddingStart).toBeUndefined()
    }
  })
})

describe('product', () => {
  test('times a duration token, written in milliseconds as the theme draws it', () => {
    const spinning = family([
      [
        'animation',
        {
          space: [
            { text: 'turn' },
            { calc: { op: '*', operands: [{ token: 'duration-slow' }, { number: 3 }] } },
            { text: 'linear' },
            { text: 'infinite' },
          ],
        },
      ],
    ])
    const turning: Family = {
      ...spinning,
      rules: [
        ...spinning.rules,
        { frames: [['to', [['rotate', { text: '1turn' }]]]], kind: 'keyframes', name: 'turn' },
      ],
    }
    const turns = (duration: string) =>
      style(turning, 'host', { conditions: {}, tokens: { 'duration-slow': duration } }).motion
        ?.duration
    expect(turns('320ms')).toBe(960)
    expect(turns('0.32s')).toBe(960)
  })
})

describe('inherit', () => {
  test('leaves the property unset, and reports no drop', () => {
    const drawn = style(
      family([
        ['font-family', { text: 'serif' }],
        ['font-family', { hook: { fallback: { keyword: 'inherit' }, name: 'font-family' } }],
      ]),
      'host',
      { conditions: {}, tokens },
    )
    expect(drawn.style.fontFamily).toBeUndefined()
    expect(drawn.dropped).toEqual([])
  })

  test('takes the hook where it is set', () => {
    const drawn = style(
      family([['font-family', { hook: { fallback: { keyword: 'inherit' }, name: 'font' } }]]),
      'host',
      { conditions: {}, hooks: { font: 'Georgia' }, tokens },
    )
    expect(drawn.style.fontFamily).toBe('Georgia')
  })
})

describe('quote', () => {
  test("draws the locale's marks, and the inner pair inside a quotation", () => {
    expect(quotationMark('open', 'de-DE')).toBe('„')
    expect(quotationMark('close', 'de-DE')).toBe('“')
    expect(quotationMark('open', 'en-US', 1)).toBe('‘')
    expect(quotationMark('open', 'fr')).toBe('«')
    expect(quotationMark('open', 'pt-PT')).toBe('«')
    expect(quotationMark('open', 'zh-TW')).toBe('「')
    expect(quotationMark('open', 'xx')).toBe('“')
    expect(quotationMark('no-open', 'de')).toBe('')
  })

  test('draws the mark before the part, and nothing for a `no-` mark', () => {
    const marked = style(family([], { quote: { alt: { text: '""' }, mark: 'open' } }), 'host', {
      conditions: {},
      locale: 'ja-JP',
      tokens,
    })
    /* An empty `alt` draws the mark and leaves it unread. */
    expect(marked.generated?.before).toMatchObject({ unread: true, words: '「' })
    const read = style(family([], { quote: { mark: 'open' } }), 'host', {
      conditions: {},
      locale: 'ja-JP',
      tokens,
    })
    expect(read.before).toBe('「')
    const unmarked = style(family([], { quote: { mark: 'no-open' } }), 'host', {
      conditions: {},
      tokens,
    })
    expect(unmarked.before).toBeUndefined()
  })
})

describe('scheme', () => {
  test("takes the value for the theme's mode, the light one where none is given", () => {
    const value = { scheme: { dark: { token: 'color-border' }, light: { text: 'transparent' } } }
    const color = (scheme?: 'dark' | 'light') =>
      style(family([['border-color', value]]), 'host', {
        conditions: {},
        tokens,
        ...(scheme === undefined ? {} : { scheme }),
      }).style.borderColor
    expect(color('dark')).toBe('#cccccc')
    expect(color('light')).toBe('transparent')
    expect(color()).toBe('transparent')
  })
})

describe('ch and lh', () => {
  test("resolve a `ch` from the font's `0`, half an em when it is not measured", () => {
    const measure = (zero?: number) =>
      style(family([['max-inline-size', { text: '40ch' }]]), 'host', {
        conditions: {},
        fontSize: 16,
        tokens,
        ...(zero === undefined ? {} : { zero }),
      }).style.maxWidth
    expect(measure()).toBe(320)
    expect(measure(0.6)).toBe(384)
  })

  test('resolve an `lh` from the line height declared from the host down', () => {
    const lifted = (height: Declaration[1] | undefined, lineHeight?: number) =>
      style(
        family([
          ...(height === undefined ? [] : [['line-height', height] as const]),
          [
            'margin-block-start',
            {
              calc: {
                op: '/',
                operands: [
                  { calc: { op: '-', operands: [{ text: '1lh' }, { text: '16px' }] } },
                  { number: 2 },
                ],
              },
            },
          ],
        ]),
        'host',
        {
          conditions: {},
          fontSize: 16,
          tokens,
          ...(lineHeight === undefined ? {} : { lineHeight }),
        },
      ).style.marginTop
    expect(lifted({ number: 1.5 })).toBe(4)
    expect(lifted({ text: '1.5rem' })).toBe(4)
    expect(lifted(undefined, 28)).toBe(6)
    expect(lifted(undefined)).toBeCloseTo(1.6)
  })
})

describe('derived', () => {
  test("calls core's derivation with the element's props", () => {
    expect(derive('gridTemplate', { columns: 8 })).toBe('repeat(8, minmax(0, 1fr))')
    expect(derive('noSuchDerivation', {})).toBeUndefined()
  })

  test('takes its fallback where the props ask for nothing', () => {
    const value = {
      derived: {
        fallback: { text: 'auto minmax(0, 1fr)' },
        function: 'gridTemplate',
        name: 'grid-template',
      },
    }
    const tracks = (props: Record<string, unknown>) =>
      style(
        family([
          ['display', { text: 'grid' }],
          ['grid-template-columns', value],
        ]),
        'host',
        { conditions: {}, props, tokens },
      ).layout.tracks
    expect(tracks({})).toEqual(['auto', 'minmax(0, 1fr)'])
    expect(tracks({ columns: 8 })[0]).toStartWith('repeat(8,')
  })
})
