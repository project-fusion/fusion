/*
 * The generated Tabs' own glyphs, drawn from the real intermediate forms: the
 * close mark of a dismissible tab is an em of the tab's words, as
 * `[part="dismiss-mark"]` sizes it on the web. `test:native` writes the
 * components beside this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { Dimensions, StyleSheet, View } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { HelixTab, HelixTabs } from './tabs/index.native'

/** A glyph that shows what it was asked to draw, as a view a spec can read. */
const Recorded = ({ color, name, size }: GlyphProps) => (
  <View style={{ backgroundColor: color, height: size, width: size }} testID={`glyph ${name}`} />
)

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

beforeEach(() => {
  atTextSize(1)
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
})

const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

const drawn = () =>
  render(
    <HelixTheme Glyph={Recorded} mode="light">
      <HelixTabs>
        <HelixTab dismissible value="a">
          Alpha
        </HelixTab>
      </HelixTabs>
    </HelixTheme>,
  )

const markHeight = (): number =>
  styleOf(screen.getByTestId('glyph x', { includeHiddenElements: true })).height as number

describe("a dismissible tab's close mark", () => {
  test('is an em of the words', async () => {
    await drawn()
    expect(markHeight()).toBeCloseTo(styleOf(screen.getByText('Alpha')).fontSize as number, 3)
  })

  test('stops growing at the largest standard text size, 1.353 times', async () => {
    await drawn()
    const at = markHeight()
    await act(() => atTextSize(3.571))
    expect(markHeight()).toBeCloseTo(at * 1.353, 1)
  })
})
