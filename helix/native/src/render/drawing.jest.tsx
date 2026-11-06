import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import type { Family, Rule } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { element } from './element'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* A count in miniature: a pill that clips what it holds and casts a ring,
   whose words stay on one line and end in an ellipsis, at least three
   characters wide, with a dot before them and a mark after. */
const count: Family = {
  name: 'count',
  rules: [
    rule({
      order: 0,
      set: [
        ['overflow', { text: 'hidden' }],
        [
          'box-shadow',
          {
            space: [
              { number: 0 },
              { number: 0 },
              { number: 0 },
              { number: 2 },
              { text: '#ffffff' },
            ],
          },
        ],
        ['white-space', { text: 'nowrap' }],
        ['text-overflow', { text: 'ellipsis' }],
        ['font-size', { number: 20 }],
        ['min-inline-size', { text: '3ch' }],
      ],
      specificity: [0, 1, 0],
      target: 'pill',
    }),
    rule({
      inner: '::before',
      order: 1,
      set: [
        ['content', { text: '""' }],
        ['inline-size', { number: 6 }],
      ],
      specificity: [0, 1, 1],
      target: 'pill',
    }),
    rule({
      inner: '::after',
      order: 2,
      set: [['content', { text: '"+"' }]],
      specificity: [0, 1, 1],
      target: 'pill',
    }),
  ],
  tag: 'helix-count',
  tree: [
    {
      children: [{ attributes: { part: 'label' }, kind: 'region', name: 'default' }],
      kind: 'box',
      name: 'pill',
    },
  ],
  version: '2.0',
}

const Count = element(count, () => ({
  marks: [],
  parts: { pill: { view: { testID: 'pill' } } },
}))

const drawn = (id: string): Record<string, unknown> =>
  StyleSheet.flatten(screen.getByTestId(id, { includeHiddenElements: true }).props.style)

const draw = () =>
  render(
    <ThemeProvider tokens={{}}>
      <Count>99</Count>
    </ThemeProvider>,
  )

describe('a box', () => {
  test('clips what it holds and casts its shadow', async () => {
    await draw()
    expect(drawn('pill')).toMatchObject({
      boxShadow: '0px 0px 0px 2px #ffffff',
      overflow: 'hidden',
    })
  })

  test('draws its words on one line, ending in an ellipsis', async () => {
    await draw()
    const words = screen.getByText('99')
    expect(words.props).toMatchObject({ ellipsizeMode: 'tail', numberOfLines: 1 })
    expect(StyleSheet.flatten(words.props.style)).not.toHaveProperty('numberOfLines')
  })

  test('draws the box its `::before` draws, and the words its `::after` says', async () => {
    await draw()
    const pill = screen.getByTestId('pill', { includeHiddenElements: true })
    const dot = pill.children[0]
    expect(
      typeof dot === 'string' ? undefined : StyleSheet.flatten(dot?.props.style),
    ).toMatchObject({ width: 6 })
    expect(screen.getByText('+')).toBeTruthy()
  })
})

describe('a ch', () => {
  test('is half an em until the font’s 0 is measured, and that 0 after', async () => {
    await draw()
    expect(drawn('pill').minWidth).toBe(30)
    const zero = screen.getByTestId('helix-zero', { includeHiddenElements: true })
    await act(async () => {
      fireEvent(zero, 'textLayout', { nativeEvent: { lines: [{ width: 9.6 }] } })
    })
    /* The probe is drawn at the page's 16 points, so its 0 is 0.6 of an em,
       and three of them at the pill's 20 points are 36. */
    expect(drawn('pill').minWidth).toBe(36)
  })
})
