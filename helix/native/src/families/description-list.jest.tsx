/*
 * The generated Description List and its items, drawn from their real
 * intermediate forms: a column of pairs, each a term over its definition, or
 * beside it under `direction="row"`, with the values at the end under
 * `justify="between"` and a rule between pairs under `divided`.
 * `test:native` writes the components beside this file, as the styled
 * package's build writes the ones it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet } from 'react-native'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixDescriptionList, HelixDescriptionListItem } from './description-list/index.native'
import { HelixText } from './text/index.native'

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

/** The list's own view: the first drawn. */
const hostOf = (json: unknown) =>
  (Array.isArray(json) ? json[0] : json) as {
    children: unknown[]
    props: Readonly<Record<string, unknown>>
  }

/** The item that draws the words `label`: the view around its term. */
const itemOf = (label: string) => {
  const term = screen.getByText(label).parent
  return term?.parent
}

/** The definition the words `words` are drawn in: the nearest view a screen reader hears as one. */
const definitionOf = (words: string) => {
  let at = screen.getByText(words).parent
  while (at !== null && at.props.role !== 'definition') {
    at = at.parent
  }
  return at
}

/** A layout event of a view `width` wide. */
const layoutOf = (width: number) => ({ nativeEvent: { layout: { height: 20, width } } })

const pairs = (props: Readonly<Record<string, unknown>> = {}) => (
  <HelixDescriptionList {...props}>
    <HelixDescriptionListItem label="Owner">Ada Lovelace</HelixDescriptionListItem>
    <HelixDescriptionListItem label="Total">1,204</HelixDescriptionListItem>
  </HelixDescriptionList>
)

describe('the generated Description List', () => {
  test('stacks each term over its value, the pairs a medium step apart', async () => {
    const view = await render(themed(pairs()))
    expect(styleOf(itemOf('Owner'))).toMatchObject({ flexDirection: 'column' })
    const list = hostOf(view.toJSON()).children[0]
    expect(styleOf(list)).toMatchObject({ flexDirection: 'column', gap: tokens['space-md'] })
  })

  test('draws the term muted and medium, and the value in the foreground', async () => {
    await render(themed(pairs()))
    expect(styleOf(screen.getByText('Owner'))).toMatchObject({
      color: tokens['color-foreground-muted'],
      fontSize: tokens['text-sm'],
      fontWeight: String(tokens['weight-medium']),
    })
    expect(styleOf(screen.getByText('Ada Lovelace'))).toMatchObject({
      color: tokens['color-foreground'],
    })
  })

  test('sets each term beside its value under `direction="row"`', async () => {
    await render(themed(pairs({ direction: 'row' })))
    expect(styleOf(itemOf('Owner'))).toMatchObject({
      columnGap: tokens['space-lg'],
      flexDirection: 'row',
    })
    expect(styleOf(screen.getByText('Ada Lovelace').parent)).toMatchObject({ flexGrow: 1 })
  })

  test('stacks the pairs again where the list is narrower than 22 rem', async () => {
    await render(themed(pairs({ direction: 'row' })))
    const host = itemOf('Owner')?.parent?.parent
    await act(() =>
      fireEvent(host as never, 'layout', { nativeEvent: { layout: { height: 100, width: 300 } } }),
    )
    expect(styleOf(itemOf('Owner'))).toMatchObject({ flexDirection: 'column' })
    await act(() =>
      fireEvent(host as never, 'layout', { nativeEvent: { layout: { height: 100, width: 400 } } }),
    )
    expect(styleOf(itemOf('Owner'))).toMatchObject({ flexDirection: 'row' })
  })

  test('gives every term the width of the widest under `direction="row"`, as the web’s label column', async () => {
    await render(themed(pairs({ direction: 'row' })))
    const owner = screen.getByText('Owner').parent
    const total = screen.getByText('Total').parent
    await act(() => fireEvent(owner as never, 'layout', layoutOf(48)))
    expect(styleOf(owner)).not.toHaveProperty('minWidth')
    await act(() => fireEvent(total as never, 'layout', layoutOf(36)))
    expect([styleOf(owner).minWidth, styleOf(total).minWidth]).toEqual([48, 48])
  })

  test('sizes no term from the others while it stacks over its value', async () => {
    await render(themed(pairs()))
    const owner = screen.getByText('Owner').parent
    expect(owner?.props.onLayout).toBeUndefined()
    expect(styleOf(owner)).not.toHaveProperty('minWidth')
  })

  test('stacks several values in the value column', async () => {
    await render(
      themed(
        <HelixDescriptionList direction="row">
          <HelixDescriptionListItem label="Owners">
            <HelixText>Ada Lovelace</HelixText>
            <HelixText>Grace Hopper</HelixText>
          </HelixDescriptionListItem>
        </HelixDescriptionList>,
      ),
    )
    const value = definitionOf('Ada Lovelace')
    expect(definitionOf('Grace Hopper')).toBe(value)
    expect(styleOf(value).flexDirection ?? 'column').toBe('column')
  })

  test('puts the values at the end in even figures under `justify="between"`', async () => {
    await render(themed(pairs({ direction: 'row', justify: 'between' })))
    expect(styleOf(screen.getByText('1,204'))).toMatchObject({
      fontVariant: 'tabular-nums',
      textAlign: 'right',
    })
  })

  test('draws a rule between pairs, and none above the first, under `divided`', async () => {
    await render(themed(pairs({ divided: true })))
    expect(styleOf(itemOf('Owner'))).not.toHaveProperty('borderTopWidth')
    expect(styleOf(itemOf('Total'))).toMatchObject({
      borderTopColor: tokens['color-border'],
      borderTopWidth: 1,
      paddingTop: tokens['space-md'],
    })
  })
})

describe('what a screen reader hears', () => {
  test('each label is a term and each value its definition', async () => {
    await render(themed(pairs()))
    expect(screen.getByText('Owner').parent?.props.role).toBe('term')
    expect(screen.getByText('Ada Lovelace').parent?.props.role).toBe('definition')
  })

  test('a list with a label is a group named by it, and one without has no role', async () => {
    const view = await render(themed(pairs({ label: 'Order details' })))
    expect(hostOf(view.toJSON()).props).toMatchObject({
      accessibilityLabel: 'Order details',
      role: 'group',
    })
    await view.rerender(themed(pairs()))
    expect(hostOf(view.toJSON()).props.role).toBeUndefined()
  })
})
