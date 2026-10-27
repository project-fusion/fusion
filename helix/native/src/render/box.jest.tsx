import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import type { Family, Rule } from '../style/form'
import { type GlyphProps, ThemeProvider } from '../theme/theme'
import { element } from './element'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* A close button in miniature: a press in the danger color, holding a mark
   that draws the `x` glyph, and a ring CSS centers over it. */
const close: Family = {
  name: 'close',
  rules: [
    rule({
      order: 0,
      set: [
        ['color', { text: '#aa0000' }],
        ['font-size', { number: 20 }],
      ],
      specificity: [0, 1, 0],
      target: 'press',
    }),
    rule({
      order: 1,
      set: [
        ['inset', { number: 0 }],
        ['margin', { text: 'auto' }],
        ['position', { text: 'absolute' }],
        ['inline-size', { number: 12 }],
      ],
      specificity: [0, 1, 0],
      target: 'ring',
    }),
  ],
  tag: 'helix-close',
  tree: [
    {
      attributes: { label: 'Close' },
      children: [
        { attributes: { decorative: true, glyph: 'x' }, kind: 'box', name: 'mark' },
        { attributes: { decorative: true }, kind: 'box', name: 'ring' },
      ],
      kind: 'pressable',
      name: 'press',
    },
  ],
  version: '2.0',
}

const Close = element(close, () => ({
  marks: [],
  parts: { ring: { view: { testID: 'ring' } } },
}))

/** A glyph that writes what it is given, for a spec to read. */
const Glyph = ({ color, name, size }: GlyphProps) => (
  <Text testID="glyph">{`${name} in ${color} at ${size}`}</Text>
)

describe('box', () => {
  test('a glyph is drawn in the color and at the size of the text around it', async () => {
    await render(
      <ThemeProvider Glyph={Glyph} tokens={{}}>
        <Close />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('glyph', { includeHiddenElements: true })).toHaveTextContent(
      'x in #aa0000 at 20',
    )
  })

  test('a glyph is left out where the theme draws none', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Close />
      </ThemeProvider>,
    )
    expect(screen.queryByTestId('glyph', { includeHiddenElements: true })).toBeNull()
  })

  test('a box CSS centers with `inset: 0` and `margin: auto` is centered in a layer', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Close />
      </ThemeProvider>,
    )
    const layer = screen.getByTestId('ring', { includeHiddenElements: true })
    expect(layer).toHaveStyle({
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    })
    expect(layer.children[0]).toHaveStyle({ width: 12 })
  })
})
