/*
 * The generated Flex, drawn from its real intermediate form: a flex view
 * that lays out what is passed in, in a row or a column, with its gaps on
 * the space scale, its patterns, and a switch decided by its own measured
 * width. `test:native` writes the component beside this file, as the styled
 * package's build writes the one it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions } from 'react-native'
import { SPACE_SCALE_LIMIT } from '../theme/drawn'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixButton } from './button/index.native'
import { type Drawn, styleOf } from './drawn'
import { HelixFlex } from './flex/index.native'
import { HelixText } from './text/index.native'

const scaled = (fontScale: number) => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

beforeEach(() => {
  scaled(1)
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

/** The flex's own view: the first drawn. */
const hostOf = (json: unknown): Drawn => (Array.isArray(json) ? json[0] : json) as Drawn

/** Each item's own view, in order. */
const itemsOf = (json: unknown): Drawn[] =>
  (hostOf(json).children ?? []).filter((child): child is Drawn => typeof child !== 'string')

/** The flex's own view, which measures its width as it lays out. */
const measuredHost = (inside: { parent: unknown } | null) => {
  let at = inside as { parent: unknown; props: Readonly<Record<string, unknown>> } | null
  while (at !== null && typeof at.props.onLayout !== 'function') {
    at = at.parent as typeof at
  }
  return at
}

/** Three buttons, each a Helix component the flex's rules reach. */
const three = [
  <HelixButton key="a">Alpha</HelixButton>,
  <HelixButton key="b">Beta</HelixButton>,
  <HelixButton key="c">Gamma</HelixButton>,
]

describe('the generated Flex', () => {
  test('is a row with no gap and no role, which adds no box of its own', async () => {
    const view = await render(themed(<HelixFlex>{three}</HelixFlex>))
    const host = hostOf(view.toJSON())
    expect(styleOf(host)).toMatchObject({ columnGap: 0, flexDirection: 'row', rowGap: 0 })
    expect(host.props.role).toBeUndefined()
    expect(host.props.accessibilityRole).toBeUndefined()
    /* It measures its width only in its `switch` layout, which reads it. */
    expect(host.props.onLayout).toBeUndefined()
    expect(itemsOf(view.toJSON())).toHaveLength(3)
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Beta' })).toBeTruthy()
  })

  test('runs in each direction', async () => {
    for (const direction of ['column', 'row-reverse', 'column-reverse'] as const) {
      const view = await render(themed(<HelixFlex direction={direction}>{three}</HelixFlex>))
      expect(styleOf(hostOf(view.toJSON()))).toMatchObject({ flexDirection: direction })
    }
  })

  test('takes its gap from the space scale, and each axis wins over it on its own', async () => {
    const view = await render(themed(<HelixFlex gap="md">{three}</HelixFlex>))
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({
      columnGap: tokens['space-md'],
      rowGap: tokens['space-md'],
    })
    await view.rerender(
      themed(
        <HelixFlex columnGap="xs" gap="md" rowGap="none">
          {three}
        </HelixFlex>,
      ),
    )
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({
      columnGap: tokens['space-xs'],
      rowGap: 0,
    })
  })

  test('stops its gaps growing at the largest standard text size', async () => {
    const view = await render(themed(<HelixFlex gap="md">{three}</HelixFlex>))
    const standard = Number(styleOf(hostOf(view.toJSON())).columnGap)
    scaled(3)
    await view.rerender(themed(<HelixFlex gap="md">{three}</HelixFlex>))
    expect(Number(styleOf(hostOf(view.toJSON())).columnGap)).toBeCloseTo(
      standard * SPACE_SCALE_LIMIT,
      1,
    )
  })

  test('wraps, and wraps upward under `wrap="reverse"`', async () => {
    const view = await render(themed(<HelixFlex wrap>{three}</HelixFlex>))
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({ flexWrap: 'wrap' })
    await view.rerender(themed(<HelixFlex wrap="reverse">{three}</HelixFlex>))
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({ flexWrap: 'wrap-reverse' })
    await view.rerender(themed(<HelixFlex wrap={false}>{three}</HelixFlex>))
    expect(styleOf(hostOf(view.toJSON())).flexWrap).toBeUndefined()
  })

  test('aligns and spreads its items in flex terms', async () => {
    const view = await render(
      themed(
        <HelixFlex alignContent="between" alignItems="end" justifyContent="around" wrap>
          {three}
        </HelixFlex>,
      ),
    )
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({
      alignContent: 'space-between',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
    })
    await view.rerender(
      themed(
        <HelixFlex alignItems="baseline" justifyContent="start">
          {three}
        </HelixFlex>,
      ),
    )
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({
      alignItems: 'baseline',
      justifyContent: 'flex-start',
    })
  })

  test('sets up each pattern, and an attribute written beside it wins', async () => {
    const view = await render(themed(<HelixFlex layout="cluster">{three}</HelixFlex>))
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({
      alignItems: 'center',
      flexWrap: 'wrap',
    })
    await view.rerender(themed(<HelixFlex layout="split">{three}</HelixFlex>))
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({
      alignItems: 'center',
      justifyContent: 'space-between',
    })
    await view.rerender(
      themed(
        <HelixFlex alignItems="start" layout="split">
          {three}
        </HelixFlex>,
      ),
    )
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({ alignItems: 'flex-start' })
  })

  test('holds the first item of a flank at its width and gives the last the rest', async () => {
    const pair = [<HelixButton key="a">Icon</HelixButton>, <HelixText key="b">Words</HelixText>]
    const view = await render(themed(<HelixFlex layout="flank">{pair}</HelixFlex>))
    const [fixed, rest] = itemsOf(view.toJSON())
    expect(styleOf(fixed as Drawn)).toMatchObject({ flexBasis: 'auto', flexGrow: 1 })
    expect(styleOf(rest as Drawn)).toMatchObject({ flexBasis: 0, flexGrow: 999, minWidth: '50%' })
    await view.rerender(themed(<HelixFlex layout="flank-end">{pair}</HelixFlex>))
    const [growing, held] = itemsOf(view.toJSON())
    expect(styleOf(growing as Drawn)).toMatchObject({ flexBasis: 0, flexGrow: 999 })
    expect(styleOf(held as Drawn)).toMatchObject({ flexBasis: 'auto', flexGrow: 1 })
  })

  test('switches between one row and one item to a line by its measured width', async () => {
    const view = await render(themed(<HelixFlex layout="switch">{three}</HelixFlex>))
    const host = measuredHost(screen.getByRole('button', { name: 'Alpha' }))
    /* Before it is measured, the items share the row. */
    expect(styleOf(itemsOf(view.toJSON())[0] as Drawn)).toMatchObject({ flexGrow: 1 })
    expect(styleOf(itemsOf(view.toJSON())[0] as Drawn).flexBasis).toBeUndefined()
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({ flexWrap: 'wrap' })
    /* Narrower than 30rem: a basis wider than the row, which each item
       shrinks from onto a line of its own. */
    await act(() =>
      fireEvent(host as never, 'layout', { nativeEvent: { layout: { height: 100, width: 300 } } }),
    )
    const narrow = styleOf(itemsOf(view.toJSON())[0] as Drawn)
    expect(narrow).toMatchObject({ flexBasis: (30 * 16 - 300) * 999, flexGrow: 1, flexShrink: 1 })
    /* Wider: no basis, so the items share the row. */
    await act(() =>
      fireEvent(host as never, 'layout', { nativeEvent: { layout: { height: 100, width: 600 } } }),
    )
    expect(styleOf(itemsOf(view.toJSON())[0] as Drawn)).toMatchObject({ flexBasis: 0, flexGrow: 1 })
  })

  test('switches at a width that grows with the reader text size', async () => {
    scaled(2)
    const view = await render(themed(<HelixFlex layout="switch">{three}</HelixFlex>))
    const host = measuredHost(screen.getByRole('button', { name: 'Alpha' }))
    await act(() =>
      fireEvent(host as never, 'layout', { nativeEvent: { layout: { height: 100, width: 800 } } }),
    )
    expect(styleOf(itemsOf(view.toJSON())[0] as Drawn)).toMatchObject({
      flexBasis: (30 * 32 - 800) * 999,
    })
  })

  test('keeps the width of its items, flowing in the words, while inline', async () => {
    const view = await render(themed(<HelixFlex inline>{three}</HelixFlex>))
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({
      alignSelf: 'flex-start',
      display: 'flex',
      flexDirection: 'row',
    })
  })
})
