/*
 * The generated Card, drawn from its real intermediate form: a surface that
 * stacks its regions in one column with one inset, the media edge to edge,
 * and a header or a footer with actions drawn as a line of its own.
 * `test:native` writes the component beside this file, as the styled
 * package's build writes the one it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet, Text } from 'react-native'
import { useInheritedText } from '../render/around'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixButton } from './button/index.native'
import { HelixCard } from './card/index.native'

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

const themed = (children: ReactNode, mode: 'dark' | 'light' = 'light') => (
  <HelixTheme mode={mode}>
    {children}
    <Tokens />
  </HelixTheme>
)

/** What a view is drawn with, flattened. */
const styleOf = (view: unknown) =>
  StyleSheet.flatten((view as { props: { style?: unknown } }).props.style as never) as Readonly<
    Record<string, unknown>
  >

/** The card's own view: the first drawn. */
const hostOf = (json: unknown) => (Array.isArray(json) ? json[0] : json)

/** Words drawn in the text style of the region they are passed into. */
const Words = ({ children }: { readonly children: string }) => (
  <Text allowFontScaling={false} style={useInheritedText()}>
    {children}
  </Text>
)

describe('the generated Card', () => {
  test('is a surface of one column, its regions an inset from its edge', async () => {
    const view = await render(themed(<HelixCard>Body</HelixCard>))
    expect(styleOf(hostOf(view.toJSON()))).toMatchObject({
      backgroundColor: tokens['color-surface'],
      borderRadius: tokens['radii-lg'],
      flexDirection: 'column',
      gap: tokens['space-sm'],
      overflow: 'hidden',
      padding: tokens['space-control'],
    })
  })

  test('stacks its regions in order: media, header, body, footer', async () => {
    const view = await render(
      themed(
        <HelixCard
          footer={<Words>Footer</Words>}
          header={<Words>Header</Words>}
          media={<Words>Media</Words>}
        >
          Body
        </HelixCard>,
      ),
    )
    const drawn = JSON.stringify(view.toJSON())
    const at = (words: string) => drawn.indexOf(`"${words}"`)
    expect(at('Media')).toBeLessThan(at('Header'))
    expect(at('Header')).toBeLessThan(at('Body'))
    expect(at('Body')).toBeLessThan(at('Footer'))
  })

  test('draws its body muted and its header in the foreground', async () => {
    await render(themed(<HelixCard header={<Words>Header</Words>}>Body</HelixCard>))
    expect(styleOf(screen.getByText('Body'))).toMatchObject({
      color: tokens['color-foreground-muted'],
    })
    expect(styleOf(screen.getByText('Header'))).toMatchObject({
      color: tokens['color-foreground'],
    })
  })

  test('draws a header with actions as a row, and one without as the header alone', async () => {
    const view = await render(
      themed(
        <HelixCard header={<Words>Header</Words>} headerActions={<HelixButton>Edit</HelixButton>}>
          Body
        </HelixCard>,
      ),
    )
    let row = screen.getByText('Header').parent
    while (row !== null && styleOf(row).flexDirection !== 'row') {
      row = row.parent
    }
    expect(styleOf(row)).toMatchObject({ alignItems: 'center', flexWrap: 'wrap' })
    await view.rerender(themed(<HelixCard header={<Words>Header</Words>}>Body</HelixCard>))
    expect(styleOf(screen.getByText('Header').parent)).toMatchObject({
      flexDirection: 'column',
      padding: tokens['space-control'],
    })
  })

  test('lets the header take the row, and keeps the actions their own width', async () => {
    await render(
      themed(
        <HelixCard
          header={<HelixButton>Header</HelixButton>}
          headerActions={<HelixButton>Edit</HelixButton>}
        />,
      ),
    )
    const [header, actions] = screen.getAllByRole('button')
    expect(styleOf(header?.parent)).toMatchObject({ flexGrow: 1, flexShrink: 1 })
    expect(styleOf(actions?.parent)).toMatchObject({ flexGrow: 0, flexShrink: 0 })
  })

  test('runs the media edge to edge, out of the inset', async () => {
    await render(themed(<HelixCard media={<HelixButton>Media</HelixButton>} />))
    const media = styleOf(screen.getByRole('button').parent)
    const inset = Number(tokens['space-control'])
    expect(media).toMatchObject({ margin: -inset, marginBottom: 0 })
  })

  test('draws media after the body under `mediaPlacement="end"`', async () => {
    await render(
      themed(<HelixCard media={<HelixButton>Media</HelixButton>} mediaPlacement="end" />),
    )
    const media = styleOf(screen.getByRole('button').parent)
    expect(media).toMatchObject({ marginBottom: -Number(tokens['space-control']), marginTop: 0 })
  })

  test('`separation="plain"` draws no frame, and `filled` no edge', async () => {
    const plain = await render(themed(<HelixCard separation="plain">Body</HelixCard>))
    expect(styleOf(hostOf(plain.toJSON()))).toMatchObject({
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    })
    expect(styleOf(hostOf(plain.toJSON()))).not.toHaveProperty('boxShadow')
    const filled = await render(themed(<HelixCard separation="filled">Body</HelixCard>))
    expect(styleOf(hostOf(filled.toJSON()))).toMatchObject({ borderColor: 'transparent' })
  })

  test('`separation="elevated"` lifts the card in the light, and draws an edge in the dark', async () => {
    const light = await render(themed(<HelixCard separation="elevated">Body</HelixCard>))
    expect(styleOf(hostOf(light.toJSON()))).toMatchObject({ borderColor: 'transparent' })
    expect(styleOf(hostOf(light.toJSON())).boxShadow).toBeDefined()
    const dark = await render(themed(<HelixCard separation="elevated">Body</HelixCard>, 'dark'))
    expect(styleOf(hostOf(dark.toJSON()))).toMatchObject({ borderColor: tokens['color-border'] })
  })

  test('`material` blurs what is behind the card over a translucent ground, and `transparent` blurs nothing', async () => {
    const intensities = (drawn: Awaited<ReturnType<typeof render>>) =>
      drawn.container
        .queryAll((node) => node.props.blurReductionFactor !== undefined)
        .map((node) => node.props.intensity as number)
    const frosted = await render(themed(<HelixCard material="frosted">Body</HelixCard>))
    expect(intensities(frosted)).toEqual([100])
    expect(styleOf(hostOf(frosted.toJSON()))).toMatchObject({
      backgroundColor: tokens['material-translucent-strong'],
    })
    await frosted.unmount()
    const glass = await render(themed(<HelixCard material="glass">Body</HelixCard>))
    expect(intensities(glass)).toEqual([50])
    await glass.unmount()
    const clear = await render(themed(<HelixCard material="transparent">Body</HelixCard>))
    expect(intensities(clear)).toEqual([])
  })
})

describe('what a screen reader hears', () => {
  test('a card with a label is a group named by it, and one without has no role', async () => {
    const named = await render(themed(<HelixCard label="Revenue">Body</HelixCard>))
    expect(hostOf(named.toJSON()).props).toMatchObject({
      accessibilityLabel: 'Revenue',
      role: 'group',
    })
    const plain = await render(themed(<HelixCard>Body</HelixCard>))
    expect(hostOf(plain.toJSON()).props.role).toBeUndefined()
  })
})
