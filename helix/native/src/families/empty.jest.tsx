/*
 * The generated Empty, drawn from its real intermediate form: its regions in
 * order, centered, with the icon, the heading, and the message styled as the
 * web styles them, and the heading a header to a screen reader. `test:native`
 * writes the component beside this file, as the styled package's build
 * writes the one it ships.
 */
import { type Announce, announce, setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet, Text, View } from 'react-native'
import { useInheritedText } from '../render/around'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { HelixButton } from './button/index.native'
import { HelixEmpty } from './empty/index.native'
import { HelixIcon } from './icon/index.native'

/** A glyph that shows what it was asked to draw, as a view a spec can read. */
const Recorded = ({ color, name, size }: GlyphProps) => (
  <View style={{ backgroundColor: color, height: size, width: size }} testID={`glyph ${name}`} />
)

beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
})

const original: Announce = announce()

afterEach(() => {
  setAnnounce(original)
})

const themed = (children: ReactNode) => (
  <HelixTheme Glyph={Recorded} mode="light">
    {children}
  </HelixTheme>
)

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** The theme's tokens, handed out of the tree. */
let tokens: Readonly<Record<string, number | string>> = {}
const Tokens = () => {
  tokens = useTokens()
  return null
}

/** Words drawn in the text style of the region they are passed into. */
const Words = ({ children }: { readonly children: string }) => (
  <Text allowFontScaling={false} style={useInheritedText()}>
    {children}
  </Text>
)

describe('what a screen reader hears', () => {
  test('says its heading as it arrives, again as it arrives anew, and not as it draws again', async () => {
    const said = fakeAnnounce()
    setAnnounce(said)
    const view = await render(themed(<HelixEmpty heading="No results" />))
    await view.rerender(themed(<HelixEmpty heading="No results" />))
    expect(said.said).toEqual([{ message: 'No results', urgency: 'polite' }])
    await view.unmount()
    await render(themed(<HelixEmpty heading="No results" />))
    expect(said.said).toHaveLength(2)
  })

  test('says the words of a heading passed in, and nothing under `noAnnounce`', async () => {
    const said = fakeAnnounce()
    setAnnounce(said)
    await render(themed(<HelixEmpty heading={<Text>Inbox zero</Text>} />))
    await render(themed(<HelixEmpty heading="No results" noAnnounce />))
    expect(said.said).toEqual([{ message: 'Inbox zero', urgency: 'polite' }])
  })
})

describe('the generated Empty', () => {
  test('draws its regions in order, centered in a column with space around it', async () => {
    const view = await render(
      themed(
        <>
          <HelixEmpty
            actions={<Words>Clear filters</Words>}
            heading="No matching invoices"
            icon={<HelixIcon name="magnifying-glass" />}
          >
            Try a different date range.
          </HelixEmpty>
          <Tokens />
        </>,
      ),
    )
    const drawn = view.toJSON()
    const host = styleOf((Array.isArray(drawn) ? drawn[0] : drawn) as never)
    expect(host).toMatchObject({
      alignItems: 'center',
      flexDirection: 'column',
      gap: tokens['space-sm'],
      padding: tokens['space-2xl'],
    })
    const order = JSON.stringify(view.toJSON())
    const at = (words: string) => order.indexOf(words)
    expect(at('glyph magnifying-glass')).toBeLessThan(at('No matching invoices'))
    expect(at('No matching invoices')).toBeLessThan(at('Try a different date range.'))
    expect(at('Try a different date range.')).toBeLessThan(at('Clear filters'))
  })

  test('draws `heading` as a header in the large step, semibold, in the foreground', async () => {
    await render(
      themed(
        <>
          <HelixEmpty heading="No projects yet" />
          <Tokens />
        </>,
      ),
    )
    const heading = screen.getByRole('header')
    expect(heading).toBeTruthy()
    expect(styleOf(screen.getByText('No projects yet'))).toMatchObject({
      color: tokens['color-foreground'],
      fontSize: tokens['text-lg'],
      fontWeight: String(tokens['weight-semibold']),
      textAlign: 'center',
    })
  })

  test('a heading passed in replaces the words `heading` draws, in the same type', async () => {
    await render(
      themed(
        <>
          <HelixEmpty heading={<Words>No projects yet</Words>} />
          <Tokens />
        </>,
      ),
    )
    expect(screen.queryByRole('header')).toBeNull()
    expect(styleOf(screen.getByText('No projects yet'))).toMatchObject({
      fontSize: tokens['text-lg'],
    })
  })

  test('draws the message muted, in the small step', async () => {
    await render(
      themed(
        <>
          <HelixEmpty>Projects you create appear here.</HelixEmpty>
          <Tokens />
        </>,
      ),
    )
    expect(styleOf(screen.getByText('Projects you create appear here.'))).toMatchObject({
      color: tokens['color-foreground-muted'],
      fontSize: tokens['text-sm'],
      textAlign: 'center',
    })
  })

  test('draws the icon at the large icon step, in the subtle color', async () => {
    await render(
      themed(
        <>
          <HelixEmpty icon={<HelixIcon name="folder-open" />} />
          <Tokens />
        </>,
      ),
    )
    const glyph = styleOf(screen.getByTestId('glyph folder-open', { includeHiddenElements: true }))
    expect(glyph).toMatchObject({
      backgroundColor: tokens['color-foreground-subtle'],
      height: tokens['size-icon-lg'],
    })
  })

  test('puts the space-sm step above each action', async () => {
    await render(
      themed(
        <>
          <HelixEmpty actions={<HelixButton>Clear filters</HelixButton>} />
          <Tokens />
        </>,
      ),
    )
    expect(styleOf(screen.getByRole('button').parent)).toMatchObject({
      marginTop: tokens['space-sm'],
    })
  })
})
