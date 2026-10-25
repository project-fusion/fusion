/*
 * The generated Skeleton, drawn from its real intermediate form: a
 * placeholder shape a sheen sweeps across, hidden from screen readers unless
 * it is named, a paragraph of lines, and the box around content that is still
 * loading. The sweep stops where the reader asks for reduced motion and while
 * the app's motion is paused. `test:native` writes the component beside this
 * file, as the styled package's build writes the one it ships.
 */
import {
  type Environment,
  environment,
  setEnvironment,
} from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, Text } from 'react-native'
import { pauseMotion } from '../render/motion'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { type Drawn, nodes, styleOf } from './drawn'
import { HelixSkeleton } from './skeleton/index.native'

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

const original: Environment = environment()

beforeEach(() => {
  atTextSize(1)
})

afterEach(() => {
  setEnvironment(original)
  pauseMotion(false)
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

/** The skeleton drawn: its host, and every view in it. */
const drawn = async (element: ReactNode) => {
  const view = await render(themed(element))
  const all = nodes(view.toJSON())
  return { all, host: all[0] as Drawn, view }
}

/** Each sheen: the layer twice its shape's width. */
const sheensOf = (all: readonly Drawn[]) => all.filter((one) => styleOf(one).width === '200%')

/** Each shape: the fill a sheen sweeps across. */
const shapesOf = (all: readonly Drawn[]) =>
  all.filter((one) => styleOf(one).backgroundColor === 'rgba(0, 0, 0, 0.08)')

describe('the generated Skeleton', () => {
  test('is hidden from screen readers while it is a placeholder with no name', async () => {
    const { host } = await drawn(<HelixSkeleton />)
    expect(host.props).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    })
    expect(host.props.accessibilityRole).toBeUndefined()
  })

  test('is one element a screen reader hears as a progress bar while it is named', async () => {
    const { host } = await drawn(<HelixSkeleton label="Loading the profile" />)
    expect(host.props).toMatchObject({
      accessibilityLabel: 'Loading the profile',
      accessibilityRole: 'progressbar',
      accessible: true,
    })
    expect(host.props.accessibilityElementsHidden).toBeUndefined()
  })

  test('is a block at the control height, a circle at the control step, or a line of text', async () => {
    const block = await drawn(<HelixSkeleton />)
    expect(styleOf(block.host)).toMatchObject({ height: tokens['size-control'] })
    const circle = await drawn(<HelixSkeleton shape="circle" />)
    expect(styleOf(circle.host)).toMatchObject({ aspectRatio: 1, width: tokens['size-control'] })
    expect(styleOf(shapesOf(circle.all)[0] as Drawn)).toMatchObject({
      borderRadius: tokens['radii-full'],
    })
    const line = await drawn(<HelixSkeleton shape="text" />)
    expect(styleOf(shapesOf(line.all)[0] as Drawn)).toMatchObject({
      borderRadius: tokens['radii-full'],
    })
  })

  test('sweeps a sheen across its shape, which clips it', async () => {
    const { all } = await drawn(<HelixSkeleton />)
    expect(styleOf(shapesOf(all)[0] as Drawn)).toMatchObject({
      overflow: 'hidden',
      position: 'relative',
    })
    const sheen = styleOf(sheensOf(all)[0] as Drawn)
    expect(String(sheen.backgroundImage)).toMatch(/^linear-gradient\(90deg, transparent 0%/)
    expect(sheen).toMatchObject({
      animationDuration: 4 * Number(tokens['duration-slow']),
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
      position: 'absolute',
    })
    const frames = sheen.animationName as Readonly<
      Record<string, { readonly transform: readonly Readonly<Record<string, unknown>>[] }>
    >
    expect(frames.from?.transform[0]).toEqual({ translateX: '-50%' })
    expect(frames.to?.transform[0]).toEqual({ translateX: '50%' })
  })

  test('stops its sweep where the reader asks for reduced motion', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const { all } = await drawn(<HelixSkeleton />)
    const sheen = styleOf(sheensOf(all)[0] as Drawn)
    expect(sheen).not.toHaveProperty('animationName')
    expect(sheen).not.toHaveProperty('backgroundImage')
  })

  test('stops its sweep while the app’s motion is paused, and sweeps again after', async () => {
    const { view } = await drawn(<HelixSkeleton />)
    await act(() => pauseMotion())
    expect(styleOf(sheensOf(nodes(view.toJSON()))[0] as Drawn)).not.toHaveProperty('animationName')
    await act(() => pauseMotion(false))
    expect(styleOf(sheensOf(nodes(view.toJSON()))[0] as Drawn)).toHaveProperty('animationName')
  })

  test('fades its shape for `pulse`, sits still for `none`, and stills the pulse with motion reduced', async () => {
    const pulse = await drawn(<HelixSkeleton effect="pulse" />)
    const shape = styleOf(shapesOf(pulse.all)[0] as Drawn)
    expect(shape.animationName).toMatchObject({ '50%': { opacity: 0.4 } })
    expect(styleOf(sheensOf(pulse.all)[0] as Drawn)).not.toHaveProperty('animationName')
    const still = await drawn(<HelixSkeleton effect="none" />)
    expect(styleOf(sheensOf(still.all)[0] as Drawn)).not.toHaveProperty('animationName')
    expect(styleOf(shapesOf(still.all)[0] as Drawn)).not.toHaveProperty('animationName')
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const reduced = await drawn(<HelixSkeleton effect="pulse" />)
    expect(styleOf(shapesOf(reduced.all)[0] as Drawn)).not.toHaveProperty('animationName')
  })

  test('draws a paragraph of lines, a line height apart, the last one shorter', async () => {
    const { all, host } = await drawn(<HelixSkeleton lines={3} shape="text" />)
    const lines = shapesOf(all)
    expect(lines).toHaveLength(3)
    expect(sheensOf(all)).toHaveLength(3)
    expect(lines.map((line) => styleOf(line).width)).toEqual([undefined, undefined, '60%'])
    expect(styleOf(host).height).toBe('auto')
    const column = all.find((one) => styleOf(one).flexDirection === 'column')
    expect(styleOf(column as Drawn).gap).toBeCloseTo(0.5 * 14, 1)
    const single = await drawn(<HelixSkeleton lines={1} shape="text" />)
    expect(shapesOf(single.all)).toHaveLength(1)
    const block = await drawn(<HelixSkeleton lines={3} />)
    expect(shapesOf(block.all)).toHaveLength(1)
  })

  test('lies over content that is loading, which keeps its place unseen and out of reach', async () => {
    const { all, host } = await drawn(
      <HelixSkeleton label="Loading" loading>
        <Text>Save the profile</Text>
      </HelixSkeleton>,
    )
    expect(host.props).toMatchObject({
      accessibilityLabel: 'Loading',
      accessibilityRole: 'progressbar',
      accessibilityState: { busy: true },
    })
    expect(styleOf(host)).toMatchObject({ alignSelf: 'flex-start', height: 'auto' })
    const content = all.find((one) => one.props.pointerEvents === 'none')
    expect(content?.props).toMatchObject({ accessibilityElementsHidden: true })
    expect(styleOf(content as Drawn).opacity).toBe(0)
    expect(styleOf(shapesOf(all)[0] as Drawn)).toMatchObject({
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    })
  })

  test('steps aside once its content has loaded, which is read as it is', async () => {
    const { all, host } = await drawn(
      <HelixSkeleton label="Loading">
        <Text>Save the profile</Text>
      </HelixSkeleton>,
    )
    expect(host.props.accessibilityRole).toBeUndefined()
    expect(host.props.accessibilityElementsHidden).toBeUndefined()
    expect(styleOf(shapesOf(all)[0] as Drawn).display).toBe('none')
    expect(screen.getByText('Save the profile')).toBeTruthy()
  })

  test('stops its height growing at the largest standard text size', async () => {
    atTextSize(3)
    const block = await drawn(<HelixSkeleton />)
    expect(tokens['size-control']).toBeCloseTo(40 * 1.353, 1)
    expect(styleOf(block.host).minHeight).toBe(tokens['size-control'])
    const line = await drawn(<HelixSkeleton shape="text" />)
    expect(styleOf(line.host).minHeight).toBeCloseTo(14 * 1.353, 1)
  })
})
