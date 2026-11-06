import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { Dimensions, StyleSheet, View } from 'react-native'
import { HelixButton } from '../families/button/index.native'
import { HelixList, HelixListItem } from '../families/list/index.native'
import { HelixTab, HelixTabPanel, HelixTabs } from '../families/tabs/index.native'
import type { Family, Rule } from '../style/form'
import { SPACE_SCALE_LIMIT } from '../theme/drawn'
import { HelixTheme } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { element } from './element'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* A labeled control in miniature, with each kind of length a family writes:
   the host's padding and height from tokens in rems, its outline offset from
   a token in points, a margin in rems and a gap in points written as they
   are; a label sized by the text tokens, with words its `::before` draws; a
   mark an em wide with no font size of its own, which draws a glyph; words
   a prop says; and a region that holds words beside a view. */
const sample: Family = {
  name: 'sample',
  rules: [
    rule({
      order: 0,
      set: [
        ['gap', { text: '2px' }],
        ['margin', { text: '0.5rem' }],
        ['min-block-size', { token: 'size-control' }],
        ['outline-offset', { token: 'size-focus-offset' }],
        ['padding', { token: 'space-md' }],
      ],
      specificity: [0, 0, 0],
      target: 'host',
    }),
    rule({
      order: 1,
      set: [
        ['font-size', { token: 'text-md' }],
        ['letter-spacing', { token: 'tracking-wide' }],
        ['line-height', { token: 'leading-normal' }],
      ],
      specificity: [0, 1, 0],
      target: 'label',
    }),
    rule({
      inner: '::before',
      order: 2,
      set: [['content', { text: '"#"' }]],
      specificity: [0, 1, 1],
      target: 'label',
    }),
    rule({
      order: 3,
      set: [['inline-size', { text: '1em' }]],
      specificity: [0, 1, 0],
      target: 'mark',
    }),
    rule({
      order: 4,
      set: [
        ['font-size', { token: 'text-xl' }],
        ['line-height', { token: 'leading-heading' }],
        [
          'padding-inline',
          { calc: { op: '+', operands: [{ token: 'space-2xs' }, { text: '0.5em' }] } },
        ],
      ],
      specificity: [0, 1, 0],
      target: 'title',
    }),
  ],
  tag: 'helix-sample',
  tree: [
    { attributes: { decorative: true, glyph: 'dot' }, kind: 'box', name: 'mark' },
    { children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'label' },
    {
      children: [{ attributes: { says: 'Title' }, kind: 'text', name: 'heading' }],
      kind: 'box',
      name: 'title',
    },
    { attributes: { says: 'Said' }, kind: 'text', name: 'said' },
    { kind: 'region', name: 'more' },
  ],
  version: '2.0',
}

/* A list in miniature, whose items each draw a numbered marker. */
const list: Family = {
  name: 'list',
  rules: [
    rule({
      order: 0,
      set: [
        ['display', { text: 'list-item' }],
        ['list-style-type', { text: 'decimal' }],
        ['counter-increment', { space: [{ text: 'list-item' }, { number: 1 }] }],
      ],
      slotted: '*',
      specificity: [0, 2, 1],
      target: 'host',
    }),
  ],
  tag: 'helix-list',
  tree: [{ kind: 'region', name: 'default' }],
  version: '2.0',
}

const row: Family = {
  name: 'list-item',
  rules: [],
  tag: 'helix-list-item',
  tree: [{ kind: 'region', name: 'default' }],
  version: '2.0',
}

const Sample = element(sample, () => ({
  marks: [],
  parts: {
    host: { view: { testID: 'host' } },
    mark: { view: { testID: 'mark' } },
    title: { view: { testID: 'title' } },
  },
}))
const List = element(list)
const Row = element(row)

/** Draws a glyph as a square of its size. */
const Dot = ({ size }: GlyphProps) => <View style={{ height: size, width: size }} testID="glyph" />

/**
 * Sets the reader's text size, as iOS and Android report a change to it:
 * React Native's `Dimensions` hears new metrics and tells each listener.
 */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
})

/** Points rounded to hundredths, as the theme and the renderer round them. */
const points = (value: number): number => Math.round(value * 100) / 100

/** The style a drawn element was given, flattened. */
const styleOf = (found: { readonly props: { readonly style?: unknown } }) =>
  StyleSheet.flatten(found.props.style as never) as Record<string, unknown>

/** Every text drawn, a screen reader's or not. */
const allText = () => screen.getAllByText(/./, { includeHiddenElements: true })

const drawSample = async () => {
  await render(
    <HelixTheme Glyph={Dot} mode="light">
      <Sample more={['Beside ', <View key="view" />]}>Words</Sample>
      <List>
        <Row key="one">One</Row>
      </List>
    </HelixTheme>,
  )
}

/* The default size; 1.353, the largest of iOS's standard sizes, where space
   stops growing; and 3.571, the largest of iOS's accessibility sizes. */
const SIZES = [1, SPACE_SCALE_LIMIT, 3.571] as const

/** The text size as space takes it: the same, up to the limit. */
const spaceAt = (size: number): number => Math.min(size, SPACE_SCALE_LIMIT)

describe('text at the reader’s text size', () => {
  test.each(SIZES)(
    'at %p, a font size, its line height, and its letter spacing grow by the text size, once',
    async (size) => {
      atTextSize(size)
      await drawSample()
      const words = styleOf(screen.getByText('Words'))
      expect(words.fontSize).toBe(points(14 * size))
      expect(words.lineHeight).toBeCloseTo(21 * size, 1)
      expect(words.letterSpacing).toBeCloseTo(0.28 * size, 1)
      expect(screen.getByText('Words').props.allowFontScaling).toBe(false)
    },
  )

  test.each(SIZES)(
    'at %p, space in rems stops at the limit, and space in points does not grow',
    async (size) => {
      atTextSize(size)
      await drawSample()
      const space = spaceAt(size)
      const host = styleOf(screen.getByTestId('host'))
      expect(host.padding).toBe(points(16 * space))
      expect(host.minHeight).toBe(points(40 * space))
      expect(host.margin).toBe(points(8 * space))
      expect(host.outlineOffset).toBe(2)
      expect(host.gap).toBe(2)
      const glyph = styleOf(screen.getByTestId('glyph', { includeHiddenElements: true }))
      const mark = styleOf(screen.getByTestId('mark', { includeHiddenElements: true }))
      /* An em in a box, and a glyph, are the page's 14 points of text at
         the space's size. */
      expect(mark.width).toBe(points(14 * space))
      expect(glyph.width).toBeCloseTo(14 * space, 2)
      const marker = styleOf(screen.getByText('1.', { includeHiddenElements: true }))
      expect(marker.fontSize).toBeCloseTo(16 * size, 2)
      expect(marker.paddingEnd).toBeCloseTo(8 * space, 2)
    },
  )

  test.each(SIZES)(
    'at %p, a calc() resolves each term by the property it lands in',
    async (size) => {
      atTextSize(size)
      await drawSample()
      const heading = styleOf(screen.getByText('Title'))
      /* `leading-heading` is `calc(0.99em + 0.5rem)`: both terms are text. */
      expect(heading.fontSize).toBe(points(24 * size))
      expect(heading.lineHeight).toBeCloseTo(0.99 * 24 * size + 8 * size, 1)
      /* `calc(space-2xs + 0.5em)` in a padding: a rem and an em of space. */
      const title = styleOf(screen.getByTestId('title'))
      expect(title.paddingHorizontal).toBeCloseTo(4 * spaceAt(size) + 12 * spaceAt(size), 1)
    },
  )

  test.each(SIZES)('at %p, words no family sizes are drawn at the page’s size', async (size) => {
    atTextSize(size)
    await render(
      <HelixTheme mode="light">
        <HelixTabs
          defaultActive="a"
          panels={[
            <HelixTabPanel key="a" value="a">
              A summary of the project.
            </HelixTabPanel>,
          ]}
        >
          <HelixTab value="a">Overview</HelixTab>
        </HelixTabs>
      </HelixTheme>,
    )
    const words = styleOf(screen.getByText('A summary of the project.'))
    expect(words.fontSize).toBe(points(14 * size))
    expect(words.lineHeight).toBeCloseTo(21 * size, 1)
    /* A tab's label sets its own size, and keeps the page's multiple for its line. */
    const label = styleOf(screen.getByText('Overview'))
    expect(label.fontSize).toBe(points(14 * size))
    expect(label.lineHeight).toBeCloseTo(21 * size, 1)
  })

  test('every text the renderer draws leaves React Native’s own scaling off', async () => {
    atTextSize(3.571)
    await drawSample()
    const drawn = allText()
    expect(drawn.map((text) => text.props.children)).toEqual(
      expect.arrayContaining(['#', 'Words', 'Said', 'Beside ', 'One', '1.']),
    )
    for (const text of drawn) {
      expect({ [String(text.props.children)]: text.props.allowFontScaling }).toEqual({
        [String(text.props.children)]: false,
      })
    }
  })

  test('every text the generated Button, List, and Tabs draw leaves it off too', async () => {
    atTextSize(3.571)
    await render(
      <HelixTheme mode="light">
        <HelixButton>Save</HelixButton>
        <HelixList>
          <HelixListItem value="a">Apples</HelixListItem>
        </HelixList>
        <HelixTabs
          panels={[
            <HelixTabPanel key="a" value="a">
              First
            </HelixTabPanel>,
          ]}
        >
          <HelixTab value="a">Alpha</HelixTab>
        </HelixTabs>
      </HelixTheme>,
    )
    const drawn = allText()
    expect(drawn.length).toBeGreaterThanOrEqual(4)
    for (const text of drawn) {
      expect({ [String(text.props.children)]: text.props.allowFontScaling }).toEqual({
        [String(text.props.children)]: false,
      })
    }
    expect(styleOf(screen.getByText('Save')).fontSize).toBe(points(14 * 3.571))
  })

  test('draws again at the new size when the reader changes the setting', async () => {
    await drawSample()
    expect(styleOf(screen.getByText('Words')).fontSize).toBe(14)
    expect(styleOf(screen.getByTestId('host')).padding).toBe(16)
    await act(() => atTextSize(3.571))
    expect(styleOf(screen.getByText('Words')).fontSize).toBe(49.99)
    expect(styleOf(screen.getByTestId('host')).padding).toBe(21.65)
    expect(styleOf(screen.getByTestId('host')).outlineOffset).toBe(2)
  })
})
