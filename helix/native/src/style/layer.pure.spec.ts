import { describe, expect, test } from 'bun:test'
import { viewported } from './calc.js'
import type { Family } from './form.js'
import { rule, tokens } from './style.fixtures.js'
import { style } from './style.js'

/** A dialog's panel: a card at a window's width, and a sheet below 30rem. */
const dialog: Family = {
  name: 'dialog',
  rules: [
    rule({
      order: 0,
      set: [
        [
          'inline-size',
          {
            function: {
              arguments: [
                { text: '28rem' },
                { calc: { op: '-', operands: [{ text: '100vw' }, { text: '2rem' }] } },
              ],
              name: 'min',
            },
          },
        ],
        ['max-block-size', { calc: { op: '-', operands: [{ text: '100dvh' }, { text: '2rem' }] } }],
      ],
      specificity: [0, 1, 0],
      target: 'surface',
    }),
    rule({
      order: 1,
      set: [['inline-size', { text: '100vw' }]],
      specificity: [0, 1, 0],
      target: 'surface',
      when: [{ below: '30rem', kind: 'window' }],
    }),
    rule({
      inner: '::backdrop',
      order: 2,
      set: [
        ['background-color', { text: '#000000' }],
        ['opacity', { number: 0 }],
      ],
      specificity: [0, 1, 1],
      target: 'surface',
    }),
    rule({
      inner: '::backdrop',
      order: 3,
      set: [['opacity', { number: 1 }]],
      specificity: [0, 2, 1],
      target: 'surface',
      when: [{ kind: 'state', name: 'open' }],
    }),
  ],
  tag: 'helix-dialog',
  tree: [{ attributes: { open: { bind: 'open' } }, kind: 'layer', name: 'surface' }],
  version: '2.0',
}

describe('a layer, which alone reads the window', () => {
  test('a viewport length is a share of the window, its dynamic height less the keyboard', () => {
    const viewport = { height: 500, tall: 800, width: 390 }
    expect(viewported('100vw', viewport)).toBe(390)
    expect(viewported('50dvh', viewport)).toBe(250)
    expect(viewported('50vh', viewport)).toBe(400)
    expect(viewported('100svh', viewport)).toBe(800)
    expect(viewported('10vmin', viewport)).toBe(39)
    expect(viewported('100vw', undefined)).toBeUndefined()
    expect(viewported('2rem', viewport)).toBeUndefined()
  })

  test('a rule under `window` holds while the window is narrower, at the reader’s text size', () => {
    const narrow = style(dialog, 'surface', {
      conditions: {},
      rem: 16,
      tokens,
      viewport: { height: 700, tall: 700, width: 390 },
    })
    expect(narrow.style.width).toBe(390)
    expect(narrow.style.maxHeight).toBe(668)
    const wide = style(dialog, 'surface', {
      conditions: {},
      rem: 16,
      tokens,
      viewport: { height: 900, tall: 900, width: 1024 },
    })
    expect(wide.style.width).toBe(448)
    /* The same window reads as narrow at a larger text size, as a page's
       media query reads the reader's font size. */
    const large = style(dialog, 'surface', {
      conditions: {},
      rem: 40,
      tokens,
      viewport: { height: 900, tall: 900, width: 1024 },
    })
    expect(large.style.width).toBe(1024)
    /* Outside a layer no window is known, and no rule under one holds. */
    const unplaced = style(dialog, 'surface', { conditions: {}, rem: 16, tokens })
    expect(unplaced.style.width).not.toBe(390)
  })

  test('the safe area is the host’s, in points, and its fallback outside a layer', () => {
    const sheet: Family = {
      ...dialog,
      rules: [
        rule({
          order: 0,
          set: [
            [
              'padding-block-end',
              {
                calc: {
                  op: '+',
                  operands: [
                    { text: '16px' },
                    {
                      function: {
                        arguments: [{ text: 'safe-area-inset-bottom' }, { text: '0px' }],
                        name: 'env',
                      },
                    },
                  ],
                },
              },
            ],
          ],
          specificity: [0, 2, 0],
          target: 'surface',
          when: [{ kind: 'state', name: 'sheet' }],
        }),
      ],
    }
    const insets = { bottom: 34, left: 0, right: 0, top: 59 }
    const viewport = { height: 800, insets, tall: 800, width: 390 }
    expect(
      style(sheet, 'surface', { conditions: { sheet: true }, tokens, viewport }).style
        .paddingBottom,
    ).toBe(50)
    /* No safe area is known outside a layer, and the fallback stands. */
    expect(
      style(sheet, 'surface', { conditions: { sheet: true }, tokens }).style.paddingBottom,
    ).toBe(16)
  })

  test('the backdrop is the scrim the host draws, and moves with the layer’s state', () => {
    const closed = style(dialog, 'surface', { conditions: {}, tokens })
    expect(closed.backdrop?.style).toEqual({ backgroundColor: '#000000', opacity: 0 })
    expect(closed.dropped).not.toContain("::backdrop: written with the web's own selectors")
    const open = style(dialog, 'surface', { conditions: { open: true }, tokens })
    expect(open.backdrop?.style.opacity).toBe(1)
    expect(open.style.opacity).toBeUndefined()
  })
})
