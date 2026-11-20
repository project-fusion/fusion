/*
 * The generated Divider, drawn from its real intermediate form: a line, the
 * words set into it, and a line, horizontal or vertical, across a toolbar it
 * sits in, and a separator to a screen reader unless it is decorative.
 * `test:native` writes the component beside this file, as the styled
 * package's build writes the one it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { isHiddenFromAccessibility, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet } from 'react-native'
import { ToolbarAxisContext } from '../render/toolbar'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixDivider } from './divider/index.native'

beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
})

/** The theme's tokens, handed out of the tree. */
let tokens: Readonly<Record<string, number | string>> = {}
const Tokens = () => {
  tokens = useTokens()
  return null
}

const themed = (children: ReactNode) => (
  <HelixTheme mode="light">
    {children}
    <Tokens />
  </HelixTheme>
)

/** What a view is drawn with, flattened. */
const styleOf = (view: unknown) =>
  StyleSheet.flatten((view as { props: { style?: unknown } }).props.style as never) as Readonly<
    Record<string, unknown>
  >

/** Every view drawn, in order, with its own children. */
interface Drawn {
  readonly children: readonly (Drawn | string)[] | null
  readonly props: Readonly<Record<string, unknown>>
}

/** The divider's host, and its two lines. */
const drawn = (json: unknown) => {
  const all = (Array.isArray(json) ? json : [json]) as Drawn[]
  const host = all[0] as Drawn
  const views = (host.children ?? []).filter((child): child is Drawn => typeof child !== 'string')
  const lines = views.filter((view) => styleOf(view).backgroundColor !== undefined)
  return { host, lines }
}

describe('the generated Divider', () => {
  test('is one horizontal line of the border color and thickness, in two halves that meet', async () => {
    const view = await render(themed(<HelixDivider />))
    const { host, lines } = drawn(view.toJSON())
    expect(styleOf(host)).toMatchObject({ alignItems: 'center', flexDirection: 'row' })
    expect(lines).toHaveLength(2)
    /* With nothing set in, the content takes no room, so the halves meet. */
    const views = (host.children ?? []).filter((child): child is Drawn => typeof child !== 'string')
    expect(views.filter((view) => styleOf(view).display === 'none')).toHaveLength(1)
    for (const line of lines) {
      expect(styleOf(line)).toMatchObject({
        backgroundColor: tokens['color-border'],
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        height: 1,
      })
    }
  })

  test('sets its words between the halves, muted, small, and on one line', async () => {
    const view = await render(themed(<HelixDivider>Or</HelixDivider>))
    const words = screen.getByText('Or')
    expect(styleOf(words)).toMatchObject({
      color: tokens['color-foreground-muted'],
      fontSize: tokens['text-xs'],
    })
    expect(words.props.numberOfLines).toBe(1)
    const order = JSON.stringify(view.toJSON())
    expect(order.indexOf('"Or"')).toBeGreaterThan(order.indexOf('backgroundColor'))
    expect(order.lastIndexOf('backgroundColor')).toBeGreaterThan(order.indexOf('"Or"'))
  })

  test('runs vertically, one line of text long at the least', async () => {
    const view = await render(themed(<HelixDivider orientation="vertical" />))
    const { host, lines } = drawn(view.toJSON())
    expect(styleOf(host)).toMatchObject({ alignSelf: 'stretch', flexDirection: 'column' })
    for (const line of lines) {
      expect(styleOf(line)).toMatchObject({ flexGrow: 1, width: 1 })
      expect(styleOf(line).minHeight).toBeGreaterThan(0)
      expect(styleOf(line)).not.toHaveProperty('height')
    }
  })

  test('runs across a horizontal toolbar it sits in, and along one that is vertical', async () => {
    const across = await render(
      themed(
        <ToolbarAxisContext.Provider value="horizontal">
          <HelixDivider />
        </ToolbarAxisContext.Provider>,
      ),
    )
    expect(styleOf(drawn(across.toJSON()).host)).toMatchObject({ flexDirection: 'column' })
    const along = await render(
      themed(
        <ToolbarAxisContext.Provider value="vertical">
          <HelixDivider />
        </ToolbarAxisContext.Provider>,
      ),
    )
    expect(styleOf(drawn(along.toJSON()).host)).toMatchObject({ flexDirection: 'row' })
  })

  test('an `orientation` written on it wins over the toolbar', async () => {
    const view = await render(
      themed(
        <ToolbarAxisContext.Provider value="horizontal">
          <HelixDivider orientation="horizontal" />
        </ToolbarAxisContext.Provider>,
      ),
    )
    expect(styleOf(drawn(view.toJSON()).host)).toMatchObject({ flexDirection: 'row' })
  })

  test('keeps a short length of line before its words under `contentPlacement="start"`', async () => {
    const view = await render(themed(<HelixDivider contentPlacement="start">Or</HelixDivider>))
    const [first, last] = drawn(view.toJSON()).lines
    expect(styleOf(first)).toMatchObject({
      flexBasis: tokens['space-lg'],
      flexGrow: 0,
      flexShrink: 0,
    })
    expect(styleOf(last)).toMatchObject({ flexGrow: 1 })
  })

  test('and after them under `contentPlacement="end"`', async () => {
    const view = await render(themed(<HelixDivider contentPlacement="end">Or</HelixDivider>))
    const [first, last] = drawn(view.toJSON()).lines
    expect(styleOf(first)).toMatchObject({ flexGrow: 1 })
    expect(styleOf(last)).toMatchObject({ flexBasis: tokens['space-lg'], flexGrow: 0 })
  })
})

describe('what a screen reader hears', () => {
  test('the first line is a separator, and the second is drawn only', async () => {
    const view = await render(themed(<HelixDivider />))
    const [first, last] = drawn(view.toJSON()).lines
    expect(first?.props.role).toBe('separator')
    expect(last?.props.role).toBeUndefined()
    expect(last?.props.accessibilityRole).toBeUndefined()
  })

  test('a decorative line is hidden', async () => {
    const view = await render(themed(<HelixDivider decorative />))
    const [first] = drawn(view.toJSON()).lines
    expect(first?.props.importantForAccessibility).toBe('no-hide-descendants')
  })

  test('the words set into the line are read where they are', async () => {
    await render(themed(<HelixDivider>Or</HelixDivider>))
    expect(isHiddenFromAccessibility(screen.getByText('Or'))).toBe(false)
  })
})
