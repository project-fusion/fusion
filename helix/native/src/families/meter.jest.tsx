/*
 * The generated Meter, drawn from its real intermediate form: one element a
 * screen reader hears as a progress bar with its reading, a bar filled as a
 * share of the range in its band's color, a tick at each threshold, and the
 * same reading drawn round as a ring or an arc. `test:native` writes the
 * component beside this file, as the styled package's build writes the one
 * it ships.
 */
import { type Announce, announce, setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, Text, View } from 'react-native'
import { useInheritedText } from '../render/around'
import { mix } from '../style/color'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { type Drawn, nodes, styleOf, wordsOf } from './drawn'
import { HelixMeter, HelixMeterSegment } from './meter/index.native'
import { HelixText } from './text/index.native'

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

const original: Announce = announce()

beforeEach(() => {
  atTextSize(1)
})

afterEach(() => {
  setAnnounce(original)
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

/** Words drawn in the text style of the region they are passed into. */
const Words = ({ children }: { readonly children: string }) => (
  <Text allowFontScaling={false} style={useInheritedText()}>
    {children}
  </Text>
)

/** The meter drawn: its host, every view in it, and the views it draws. */
const drawn = async (element: ReactNode) => {
  const view = await render(themed(element))
  const all = nodes(view.toJSON())
  const host = all[0] as Drawn
  return { all, host }
}

/** The fill: the view scaled along the track. */
const fillOf = (all: readonly Drawn[]) => {
  const fill = all.find((one) =>
    (styleOf(one).transform as { scaleX?: number }[] | undefined)?.some(
      (step) => step.scaleX !== undefined,
    ),
  )
  expect(fill).toBeDefined()
  return styleOf(fill as Drawn)
}

/** How far along the track the fill reaches, as its scale says. */
const scaleOf = (all: readonly Drawn[]): number | undefined =>
  (fillOf(all).transform as { scaleX?: number }[]).find((step) => step.scaleX !== undefined)?.scaleX

/** Each tick on the bar: a view placed at a share of the track. */
const ticksOf = (all: readonly Drawn[]) =>
  all
    .map(styleOf)
    .filter((style) => typeof style.start === 'string' && style.position === 'absolute')

/** How long a circle's first dash is, in its own units. */
const dashOf = (circle: Readonly<Record<string, unknown>> | undefined): number =>
  Number((circle?.strokeDasharray as readonly string[] | undefined)?.[0])

/** The circles of a round shape, in the order they are drawn. */
const circlesOf = (all: readonly Drawn[]) => all.filter((one) => one.type === 'RNSVGCircle')

describe('the generated Meter', () => {
  test('is one element a screen reader hears as a progress bar, with its reading', async () => {
    const { host } = await drawn(<HelixMeter label="Disk used" value={42} />)
    expect(host.props).toMatchObject({
      accessibilityLabel: 'Disk used',
      accessibilityRole: 'progressbar',
      accessibilityValue: { max: 100, min: 0, now: 42, text: '42%' },
      accessible: true,
    })
  })

  test('holds where it stands inside the range, and says a value past an end as it is', async () => {
    const over = await drawn(<HelixMeter label="Quota" value={140} />)
    expect(over.host.props.accessibilityValue).toEqual({ max: 100, min: 0, now: 100, text: '140%' })
    const under = await drawn(<HelixMeter label="Quota" value={-10} />)
    expect(under.host.props.accessibilityValue).toEqual({ max: 100, min: 0, now: 0, text: '-10%' })
    const offset = await drawn(<HelixMeter label="Cabin" max={30} min={15} value={23} />)
    expect(offset.host.props.accessibilityValue).toMatchObject({ max: 30, min: 15, now: 23 })
  })

  test('reads its words as `value-text` and `format-options` write them', async () => {
    const written = await drawn(
      <HelixMeter label="Storage" max={32} value={18} valueText="18 GB of 32 GB" />,
    )
    expect(written.host.props.accessibilityValue).toMatchObject({ text: '18 GB of 32 GB' })
    const unit = await drawn(
      <HelixMeter
        formatOptions={{ style: 'unit', unit: 'gigabyte' }}
        label="Storage"
        max={32}
        showValue
        value={18}
      />,
    )
    expect(unit.host.props.accessibilityValue).toMatchObject({ text: '18 GB' })
    expect(screen.getByText('18 GB', { includeHiddenElements: true })).toBeTruthy()
  })

  test('is named by the words of its label region, and draws a label of words as none', async () => {
    const named = await drawn(<HelixMeter label="Disk" value={42} />)
    expect(screen.queryByText('Disk', { includeHiddenElements: true })).toBeNull()
    expect(named.host.props.accessibilityLabel).toBe('Disk')
    const labeled = await drawn(<HelixMeter label={<Words>Disk used</Words>} value={42} />)
    expect(screen.getByText('Disk used', { includeHiddenElements: true })).toBeTruthy()
    expect(labeled.host.props.accessibilityLabel).toBe('Disk used')
  })

  test('fills its bar as a share of the range, from the inline start, and stops at each end', async () => {
    const at = async (props: Readonly<Record<string, number>>) =>
      scaleOf((await drawn(<HelixMeter label="Disk" {...props} />)).all)
    expect(await at({ value: 0 })).toBe(0)
    expect(await at({ value: 25 })).toBe(0.25)
    expect(await at({ value: 100 })).toBe(1)
    expect(await at({ value: 140 })).toBe(1)
    expect(await at({ value: -10 })).toBe(0)
    expect(await at({ max: 30, min: 15, value: 23 })).toBeCloseTo(8 / 15, 5)
    const { all } = await drawn(<HelixMeter label="Disk" value={42} />)
    /* Over the whole track, which lays its segments out in a row. */
    expect(fillOf(all)).toMatchObject({
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      transformOrigin: 'left center',
    })
  })

  test('colors the fill by its band, and `band` sets the band outright', async () => {
    const colorAt = async (value: number, band?: 'fair' | 'good' | 'poor') =>
      fillOf(
        (
          await drawn(
            <HelixMeter
              high={80}
              label="Disk"
              low={50}
              optimum={0}
              value={value}
              {...(band === undefined ? {} : { band })}
            />,
          )
        ).all,
      ).backgroundColor
    expect(await colorAt(34)).toBe(tokens['color-success'])
    expect(await colorAt(66)).toBe(tokens['color-warning'])
    expect(await colorAt(94)).toBe(tokens['color-danger'])
    expect(await colorAt(34, 'poor')).toBe(tokens['color-danger'])
    const unbanded = await drawn(<HelixMeter label="Disk" value={34} />)
    expect(fillOf(unbanded.all).backgroundColor).toBe(tokens['color-primary'])
  })

  test('marks each threshold with a tick centered on it, and has none without thresholds', async () => {
    const banded = await drawn(<HelixMeter high={80} label="Disk" low={50} value={34} />)
    expect(ticksOf(banded.all)).toEqual([
      expect.objectContaining({ backgroundColor: tokens['color-background'], start: '50%' }),
      expect.objectContaining({ backgroundColor: tokens['color-background'], start: '80%' }),
    ])
    expect(ticksOf(banded.all)[0]?.transform).toEqual([{ translateX: '-50%' }, { translateY: 0 }])
    const unbanded = await drawn(<HelixMeter label="Disk" value={34} />)
    expect(ticksOf(unbanded.all)).toEqual([])
  })

  test('squares the corner a value past an end ran out at', async () => {
    const over = await drawn(<HelixMeter label="Quota" value={140} />)
    expect(fillOf(over.all)).toMatchObject({ borderBottomEndRadius: 0, borderTopEndRadius: 0 })
    const under = await drawn(<HelixMeter label="Quota" value={-10} />)
    expect(fillOf(under.all)).toMatchObject({ borderBottomStartRadius: 0, borderTopStartRadius: 0 })
  })

  test('washes the band’s color over the track where its emphasis is subtle', async () => {
    const { all } = await drawn(
      <HelixMeter emphasis="subtle" high={80} label="Disk" low={50} optimum={0} value={94} />,
    )
    expect(fillOf(all).backgroundColor).toBe(
      mix(String(tokens['color-danger']), 30, String(tokens['color-surface-sunken'])),
    )
  })

  test('shows its reading beside the bar in tabular figures', async () => {
    const { host } = await drawn(<HelixMeter label="Disk" showValue value={42} />)
    expect(styleOf(host)).toMatchObject({ flexDirection: 'row' })
    expect(styleOf(screen.getByText('42%', { includeHiddenElements: true }))).toMatchObject({
      fontSize: tokens['text-xs'],
      fontVariant: 'tabular-nums',
    })
  })

  test('draws its label on a line of its own above the bar and its reading, as the web does', async () => {
    const { all, host } = await drawn(
      <HelixMeter label={<HelixText>Tasks done</HelixText>} showValue value={42} />,
    )
    /* The label spans both columns of the web's grid, so the row wraps
       after it, and the bar shares the next line with the reading. */
    expect(styleOf(host)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' })
    const label = all.find(
      (one) => wordsOf(one) === 'Tasks done' && styleOf(one).width !== undefined,
    )
    expect(label === undefined ? undefined : styleOf(label).width).toBe('100%')
    const track = all.find((one) => styleOf(one).backgroundColor === tokens['color-surface-sunken'])
    expect(track === undefined ? undefined : styleOf(track)).toMatchObject({
      flexBasis: 0,
      flexGrow: 1,
    })
    expect(track === undefined ? undefined : styleOf(track).width).toBeUndefined()
    /* Without a reading the meter is a block, its label above its bar. */
    const block = await drawn(<HelixMeter label={<HelixText>Tasks done</HelixText>} value={42} />)
    expect(styleOf(block.host).flexWrap).toBeUndefined()
  })

  test('sends `band` as its reading moves into another band, and not as it arrives', async () => {
    const heard: unknown[] = []
    const onBand = (event: { readonly detail: unknown }) => heard.push(event.detail)
    const at = (value: number, banded = true) => (
      <HelixMeter
        label="Temperature"
        onBand={onBand}
        value={value}
        {...(banded ? { high: 25, low: 15, optimum: 20 } : {})}
      />
    )
    const view = await render(themed(at(22)))
    expect(heard).toEqual([])
    await view.rerender(themed(at(34)))
    expect(heard).toEqual([{ band: 'fair' }])
    await view.rerender(themed(at(90)))
    expect(heard).toEqual([{ band: 'fair' }])
    await view.rerender(themed(at(90, false)))
    expect(heard).toEqual([{ band: 'fair' }, { band: '' }])
  })

  test('says its reading under `live` as it moves into another band, and not as it arrives', async () => {
    const said = fakeAnnounce()
    setAnnounce(said)
    const at = (value: number, live = true) => (
      <HelixMeter high={25} label="Temperature" live={live} low={15} optimum={20} value={value} />
    )
    const view = await render(themed(at(22)))
    await view.rerender(themed(at(23)))
    expect(said.said).toEqual([])
    await view.rerender(themed(at(34)))
    expect(said.said).toEqual([{ message: '34%, Fair', urgency: 'polite' }])
    await view.rerender(themed(at(22, false)))
    expect(said.said).toHaveLength(1)
  })

  test('draws a ring as circles a hundred units long, the reading and the ticks lengths along it', async () => {
    const { all } = await drawn(
      <HelixMeter high={80} label="Memory" low={50} optimum={0} shape="ring" value={34} />,
    )
    const circles = circlesOf(all)
    const length = 2 * Math.PI * 46
    expect(circles.map((circle) => circle.props.r)).toEqual([46, 46, 46, 46])
    const [groove, low, high, fill] = circles.map((circle) => circle.props)
    expect(groove?.strokeDasharray).toEqual([
      String(Math.round(length * 1000) / 1000),
      expect.any(String),
    ])
    expect(Number(low?.strokeDashoffset)).toBeCloseTo(-length * 0.5, 2)
    expect(Number(high?.strokeDashoffset)).toBeCloseTo(-length * 0.8, 2)
    expect(dashOf(fill)).toBeCloseTo(length * 0.34, 2)
    const track = all.find((one) => one.type === 'View' && styleOf(one).width === 96)
    expect(styleOf(track as Drawn).transform).toEqual([{ rotate: '-90deg' }])
  })

  test('draws an arc as three quarters of the circle, turned so its opening is at the bottom', async () => {
    const { all } = await drawn(<HelixMeter label="Signal" shape="arc" value={88} />)
    const [groove, fill] = circlesOf(all).map((circle) => circle.props)
    const length = 2 * Math.PI * 46
    expect(dashOf(groove)).toBeCloseTo(length * 0.75, 2)
    expect(dashOf(fill)).toBeCloseTo(length * 0.88 * 0.75, 2)
    const track = all.find((one) => one.type === 'View' && styleOf(one).width === 96)
    expect(styleOf(track as Drawn).transform).toEqual([{ rotate: '135deg' }])
  })

  /* Past the largest standard size the track's height is the least it is,
     and a fill whose height was all of it measured against more: the bar ran
     past the bottom of a simulator's screen at iOS's largest text size, run
     38957410938. */
  test('lays its fill over the whole track, out of the flow that sizes it', async () => {
    atTextSize(3.571)
    const { all } = await drawn(<HelixMeter high={80} label="Disk" low={40} showValue value={88} />)
    const fill = fillOf(all)
    expect(fill).toMatchObject({ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 })
    const track = all.find((one) => styleOf(one).overflow === 'hidden')
    expect(styleOf(track as Drawn)).toMatchObject({ minHeight: tokens['size-meter'] })
    expect(styleOf(track as Drawn).height).toBeUndefined()
  })

  test('measures the sum of its segments and draws each as a slice of one bar', async () => {
    const { all, host } = await drawn(
      <HelixMeter label="Context" max={200}>
        <HelixMeterSegment label="Tools" value={60} />
        <HelixMeterSegment label="Messages" value={30} />
        <HelixMeterSegment label="Files" tone="danger" value={-5} />
      </HelixMeter>,
    )
    expect(host.props.accessibilityValue).toMatchObject({ max: 200, min: 0, now: 90, text: '45%' })
    /* The segments are the fill, so no fill of the meter's own is drawn. */
    expect(
      all.some((one) =>
        (styleOf(one).transform as { scaleX?: number }[] | undefined)?.some(
          (step) => step.scaleX !== undefined,
        ),
      ),
    ).toBe(false)
    const track = all.find((one) => styleOf(one).overflow === 'hidden')
    expect(styleOf(track as Drawn)).toMatchObject({ flexDirection: 'row' })
    const slices = all.map(styleOf).filter((style) => style.flexBasis !== undefined)
    /* As wide as each value is of the range, never shrinking, and a value
       below zero draws nothing. */
    expect(slices.map((slice) => slice.flexBasis)).toEqual(['30%', '15%', '0%'])
    expect(slices.map((slice) => slice.minWidth)).toEqual([3, 3, 0])
    expect(slices.every((slice) => slice.flexShrink === 0 && slice.flexGrow === 0)).toBe(true)
    /* The next color in the series for each, and a tone in place of its turn. */
    expect(slices.map((slice) => slice.backgroundColor)).toEqual([
      tokens['color-series-1'],
      tokens['color-series-2'],
      tokens['color-danger'],
    ])
    /* A hairline in the ground's color between neighbors, and none before the first. */
    expect(slices.map((slice) => slice.boxShadow)).toEqual([
      undefined,
      `inset 1px 0px 0px ${tokens['color-background']}`,
      `inset 1px 0px 0px ${tokens['color-background']}`,
    ])
  })

  test('measures its own value where it holds no segments', async () => {
    const { host } = await drawn(<HelixMeter label="Disk" value={42} />)
    expect(host.props.accessibilityValue).toMatchObject({ now: 42 })
  })

  test('draws its own fill where what it holds is no segment, as the web counts only segments', async () => {
    const { all, host } = await drawn(
      <HelixMeter label="Disk" value={42}>
        <View />
      </HelixMeter>,
    )
    expect(host.props.accessibilityValue).toMatchObject({ now: 42 })
    expect(
      all.some((one) =>
        (styleOf(one).transform as { scaleX?: number }[] | undefined)?.some(
          (step) => step.scaleX === 0.42,
        ),
      ),
    ).toBe(true)
  })

  test('grows its words with the reader’s text size, and its bar to the largest standard size', async () => {
    atTextSize(3)
    const { all } = await drawn(<HelixMeter label="Disk" showValue value={42} />)
    expect(tokens['size-meter']).toBeCloseTo(16 * 1.353, 1)
    expect(tokens['text-xs']).toBeCloseTo(12 * 3, 1)
    const track = all.find((one) => styleOf(one).overflow === 'hidden')
    expect(styleOf(track as Drawn)).toMatchObject({
      borderRadius: tokens['radii-sm'],
      minHeight: tokens['size-meter'],
    })
    expect(styleOf(screen.getByText('42%', { includeHiddenElements: true })).fontSize).toBe(
      tokens['text-xs'],
    )
  })
})
