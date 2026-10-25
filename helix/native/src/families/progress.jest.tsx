/*
 * The generated Progress, drawn from its real intermediate form: one element
 * a screen reader hears as a progress bar with its reading, a bar filled as a
 * share of the range, words on the bar in two inks, a segment that travels
 * while the bar is indeterminate and a hatch where motion is reduced, and the
 * same reading drawn as a ring. `test:native` writes the component beside
 * this file, as the styled package's build writes the one it ships.
 */
import { type Announce, announce, setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import {
  type Environment,
  environment,
  setEnvironment,
} from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions } from 'react-native'
import { pauseMotion } from '../render/motion'
import { mix } from '../style/color'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { type Drawn, nodes, styleOf } from './drawn'
import { HelixProgress } from './progress/index.native'

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

const spoken: Announce = announce()

afterEach(() => {
  setEnvironment(original)
  setAnnounce(spoken)
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

/** The bar drawn: its host, and every view in it. */
const drawn = async (element: ReactNode) => {
  const view = await render(themed(element))
  const all = nodes(view.toJSON())
  return { all, host: all[0] as Drawn }
}

/** The fill: the view absolute in the track that scales or travels along it. */
const fillOf = (all: readonly Drawn[]) => {
  const fill = all.find(
    (one) => styleOf(one).transformOrigin === 'left center' && styleOf(one).position === 'absolute',
  )
  expect(fill).toBeDefined()
  return styleOf(fill as Drawn)
}

/** How far along the track the fill reaches, as its scale says. */
const scaleOf = (all: readonly Drawn[]): number | undefined =>
  (fillOf(all).transform as { scaleX?: number }[]).find((step) => step.scaleX !== undefined)?.scaleX

/** How long a circle's first dash is, in its own units. */
const dashOf = (circle: Readonly<Record<string, unknown>> | undefined): number =>
  Number((circle?.strokeDasharray as readonly string[] | undefined)?.[0])

/** The circles of the ring, the groove and then the fill. */
const circlesOf = (all: readonly Drawn[]) =>
  all.filter((one) => one.type === 'RNSVGCircle').map((circle) => circle.props)

describe('the generated Progress', () => {
  test('is one element a screen reader hears as a progress bar, with its reading', async () => {
    const { host } = await drawn(<HelixProgress label="Uploading" value={62} />)
    expect(host.props).toMatchObject({
      accessibilityLabel: 'Uploading',
      accessibilityRole: 'progressbar',
      accessibilityValue: { max: 100, min: 0, now: 62, text: '62%' },
      accessible: true,
    })
  })

  test('holds its reading inside the range, and reads its own words where it has them', async () => {
    const over = await drawn(<HelixProgress label="Uploading" value={250} />)
    expect(over.host.props.accessibilityValue).toMatchObject({ now: 100, text: '100%' })
    const under = await drawn(<HelixProgress label="Uploading" value={-20} />)
    expect(under.host.props.accessibilityValue).toMatchObject({ now: 0, text: '0%' })
    const words = await drawn(
      <HelixProgress label="Importing" max={8} value={3} valueText="3 of 8 records" />,
    )
    expect(words.host.props.accessibilityValue).toEqual({
      max: 8,
      min: 0,
      now: 3,
      text: '3 of 8 records',
    })
  })

  test('says nothing of where it stands while indeterminate', async () => {
    const { host } = await drawn(<HelixProgress indeterminate label="Restoring" showValue />)
    expect(host.props.accessibilityValue).toEqual({ max: 100, min: 0 })
    expect(screen.queryByText('0%', { includeHiddenElements: true })).toBeNull()
  })

  test('fills its bar as a share of the range, from the inline start, and stops at each end', async () => {
    const at = async (props: Readonly<Record<string, number>>) =>
      scaleOf((await drawn(<HelixProgress label="Uploading" {...props} />)).all)
    expect(await at({ value: 0 })).toBe(0)
    expect(await at({ value: 62 })).toBe(0.62)
    expect(await at({ value: 100 })).toBe(1)
    expect(await at({ value: 250 })).toBe(1)
    expect(await at({ value: -20 })).toBe(0)
    expect(await at({ max: 4, value: 3 })).toBe(0.75)
    const { all } = await drawn(<HelixProgress label="Uploading" value={62} />)
    expect(fillOf(all)).toMatchObject({ backgroundColor: tokens['color-primary-surface'] })
  })

  test('shows its reading beside the bar, and none while indeterminate', async () => {
    await drawn(<HelixProgress label="Uploading" showValue value={62} />)
    expect(styleOf(screen.getByText('62%', { includeHiddenElements: true }))).toMatchObject({
      fontVariant: 'tabular-nums',
      textAlign: 'right',
    })
  })

  test('draws words on the bar in two inks, split where the fill ends', async () => {
    const { all, host } = await drawn(
      <HelixProgress label="Uploading" value={62}>
        62% uploaded
      </HelixProgress>,
    )
    expect(host.props.accessibilityValue).toMatchObject({ text: '62% uploaded' })
    const [under, over] = screen.getAllByText('62% uploaded', { includeHiddenElements: true })
    expect(styleOf(under as never).color).toBe(tokens['color-foreground'])
    expect(styleOf(over as never).color).toBe(tokens['color-foreground-on-primary'])
    const cut = all.find((one) => styleOf(one).width === '62%')
    expect(styleOf(cut as Drawn)).toMatchObject({ overflow: 'hidden', position: 'absolute' })
  })

  test('keeps the page’s ink for words over a subtle wash, and washes the fill over the track', async () => {
    const { all } = await drawn(
      <HelixProgress emphasis="subtle" label="Syncing" value={38}>
        Syncing
      </HelixProgress>,
    )
    const inks = screen
      .getAllByText('Syncing', { includeHiddenElements: true })
      .map((words) => styleOf(words as never).color)
    expect(inks).toEqual([tokens['color-foreground'], tokens['color-foreground']])
    expect(fillOf(all).backgroundColor).toBe(
      mix(String(tokens['color-primary-surface']), 30, String(tokens['color-surface-sunken'])),
    )
  })

  test('runs a segment along the track while indeterminate, touching neither end', async () => {
    const { all } = await drawn(<HelixProgress indeterminate label="Indexing" />)
    const fill = fillOf(all)
    expect(fill).toMatchObject({
      animationDuration: 5 * Number(tokens['duration-slow']),
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
    })
    const frames = fill.animationName as Readonly<
      Record<string, { readonly transform: readonly Readonly<Record<string, unknown>>[] }>
    >
    const at = (frame: string, step: string) =>
      frames[frame]?.transform.find((one) => step in one)?.[step]
    expect(Object.keys(frames)).toEqual(['0%', '35%', '65%', '100%'])
    expect([at('0%', 'translateX'), at('0%', 'scaleX')]).toEqual(['-18%', 0.18])
    expect([at('35%', 'translateX'), at('35%', 'scaleX')]).toEqual(['12%', 0.5])
    expect([at('65%', 'translateX'), at('65%', 'scaleX')]).toEqual(['52%', 0.5])
    expect([at('100%', 'translateX'), at('100%', 'scaleX')]).toEqual(['100%', 0.18])
  })

  test('holds a hatch still in place of the segment where the reader asks for reduced motion', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const { all } = await drawn(<HelixProgress indeterminate label="Indexing" />)
    const fill = fillOf(all)
    expect(fill).not.toHaveProperty('animationName')
    expect(String(fill.backgroundImage)).toMatch(/^linear-gradient\(-45deg, #ffffff 25%/)
    expect(fill.transform).toContainEqual({ scaleX: 1 })
  })

  test('holds the hatch still while the app’s motion is paused, and runs again after', async () => {
    const view = await render(themed(<HelixProgress indeterminate label="Indexing" />))
    await act(() => pauseMotion())
    expect(fillOf(nodes(view.toJSON()))).not.toHaveProperty('animationName')
    await act(() => pauseMotion(false))
    expect(fillOf(nodes(view.toJSON()))).toHaveProperty('animationName')
  })

  test('sends `complete` with its top as it arrives there, and not where it starts or runs', async () => {
    const heard: unknown[] = []
    const onComplete = (event: { readonly detail: unknown }) => heard.push(event.detail)
    const view = await render(
      themed(<HelixProgress label="Uploading" max={120} onComplete={onComplete} value={40} />),
    )
    await view.rerender(
      themed(<HelixProgress label="Uploading" max={120} onComplete={onComplete} value={150} />),
    )
    expect(heard).toEqual([{ value: '120' }])
    await view.rerender(
      themed(<HelixProgress label="Uploading" max={120} onComplete={onComplete} value={10} />),
    )
    await view.rerender(
      themed(<HelixProgress indeterminate label="Uploading" onComplete={onComplete} value={100} />),
    )
    expect(heard).toEqual([{ value: '120' }])
    const full: unknown[] = []
    await render(
      themed(
        <HelixProgress
          label="Done"
          onComplete={(event: { readonly detail: unknown }) => full.push(event.detail)}
          value={100}
        />,
      ),
    )
    expect(full).toEqual([])
  })

  test('says `complete-label` as it arrives at its end, and not where it starts full', async () => {
    const said = fakeAnnounce()
    setAnnounce(said)
    const at = (value: number) => (
      <HelixProgress completeLabel="Upload complete" label="Uploading" value={value} />
    )
    const view = await render(themed(at(40)))
    expect(said.said).toEqual([])
    await view.rerender(themed(at(100)))
    expect(said.said).toEqual([{ message: 'Upload complete', urgency: 'polite' }])
    await view.rerender(themed(at(100)))
    await view.unmount()
    await render(themed(at(100)))
    expect(said.said).toHaveLength(1)
  })

  test('draws a ring as two circles in its own box, the fill a share of the circle', async () => {
    const { all } = await drawn(<HelixProgress label="Uploading" shape="ring" value={68} />)
    const [groove, fill] = circlesOf(all)
    expect([groove?.cx, groove?.r, fill?.r]).toEqual([32, 28, 28])
    expect(dashOf(fill)).toBeCloseTo(2 * Math.PI * 28 * 0.68, 2)
    const track = all.find((one) => one.type === 'View' && styleOf(one).width === 64)
    expect(styleOf(track as Drawn).transform).toEqual([{ rotate: '-90deg' }])
  })

  test('turns and sweeps its ring while indeterminate, and holds a quarter still with motion reduced', async () => {
    const running = await drawn(<HelixProgress indeterminate label="Syncing" shape="ring" />)
    const track = running.all.find((one) => one.type === 'View' && styleOf(one).width === 64)
    expect(styleOf(track as Drawn)).toMatchObject({
      animationDuration: 5 * Number(tokens['duration-slow']),
      animationIterationCount: 'infinite',
    })
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const still = await drawn(<HelixProgress indeterminate label="Syncing" shape="ring" />)
    const [, fill] = circlesOf(still.all)
    expect(dashOf(fill)).toBeCloseTo(2 * Math.PI * 28 * 0.25, 2)
    const turning = still.all.find((one) => one.type === 'View' && styleOf(one).width === 64)
    expect(styleOf(turning as Drawn).animationDuration).toBe(19200)
  })

  test('grows its words with the reader’s text size, and its bar to the largest standard size', async () => {
    atTextSize(3)
    const { all } = await drawn(
      <HelixProgress label="Uploading" value={62}>
        62%
      </HelixProgress>,
    )
    expect(tokens['size-progress']).toBeCloseTo(8 * 1.353, 1)
    const track = all.find((one) => styleOf(one).borderRadius === tokens['radii-full'])
    expect(styleOf(track as Drawn).minHeight).toBe(tokens['size-progress'])
    const [words] = screen.getAllByText('62%', { includeHiddenElements: true })
    expect(styleOf(words as never).fontSize).toBe(tokens['text-xs'])
    expect(tokens['text-xs']).toBeCloseTo(12 * 3, 1)
  })
})
