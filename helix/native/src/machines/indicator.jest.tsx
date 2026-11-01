import { environment, setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { keys, setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { measure, setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { type FakeMeasure, fakeMeasure } from '@fusion.dev/helix-core/capabilities/measure/fake'
import { motion, setMotion } from '@fusion.dev/helix-core/capabilities/motion'
import { type FakeMotion, fakeMotion } from '@fusion.dev/helix-core/capabilities/motion/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import type { Rect } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useCallback, useMemo } from 'react'
import * as capability from '../capabilities/measure'
import type { MachineUse } from '../ir.generated'
import { merged, type UseBehavior } from '../render/behavior'
import { element } from '../render/element'
import type { Family, Rule } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { collection, type Offer, useMembers } from './collection'
import { behaviorFor } from './compose'
import { tab } from './compose.fixtures'
import { useIndicator } from './indicator'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/** The tokens the mark's transition names. */
const TOKENS = {
  'duration-normal': '250ms',
  'easing-emphasized': 'cubic-bezier(0.3, 0, 0, 1.2)',
  'easing-standard': 'cubic-bezier(0.2, 0, 0, 1)',
}

/** A length the mark's style reads where it is placed, and `0px` before. */
const measured = (name: string) => ({ measured: { fallback: { text: '0px' }, name } })

/* The mark as Tabs' underlined marker draws it: as wide as the chosen tab,
   two high, at the tab's bottom edge, hidden until it is placed, and
   traveling along `translate`'s transition. */
const MARK: readonly Rule[] = [
  rule({
    order: 1,
    set: [
      ['block-size', { text: '2px' }],
      ['inline-size', measured('indicator-inline-size')],
      ['opacity', { number: 0 }],
      ['position', { text: 'absolute' }],
      [
        'transition',
        {
          list: [
            {
              space: [
                { text: 'translate' },
                { token: 'duration-normal' },
                { token: 'easing-emphasized' },
              ],
            },
          ],
        },
      ],
      [
        'translate',
        {
          space: [
            measured('indicator-x'),
            {
              calc: {
                op: '+',
                operands: [
                  measured('indicator-y'),
                  {
                    calc: {
                      op: '-',
                      operands: [measured('indicator-block-size'), { text: '2px' }],
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    ],
    specificity: [0, 1, 0],
    target: 'indicator',
  }),
  rule({
    order: 2,
    set: [['opacity', { number: 1 }]],
    specificity: [0, 2, 0],
    target: 'indicator',
    when: [{ kind: 'part', name: 'data-placed', value: true }],
  }),
]

/* The strip: a row, which scrolls along its line or does not. */
const ROW: Rule['set'] = [['display', { text: 'flex' }]]
const SCROLLS: Rule['set'] = [...ROW, ['overflow-x', { text: 'auto' }]]

/** A tab set in miniature, bound as the expansion binds Tabs' mark, whose strip scrolls where `scrolls`. */
const strip = (scrolls: boolean): Family =>
  ({
    api: {
      events: [],
      props: [{ attribute: true, name: 'active', tier: 'headless', type: 'string' }],
      states: [],
    },
    machines: [{ bind: { mark: { part: 'indicator' } }, machine: 'indicator' }],
    name: 'tabs',
    rules: [
      rule({ order: 0, set: scrolls ? SCROLLS : ROW, specificity: [0, 1, 0], target: 'tabs' }),
      ...MARK,
    ],
    tag: 'helix-tabs',
    tree: [
      {
        attributes: { role: 'tablist' },
        children: [
          { kind: 'region', name: 'default' },
          { attributes: { decorative: true }, kind: 'box', name: 'indicator' },
        ],
        kind: 'box',
        name: 'tabs',
      },
    ],
    version: '2.0',
  }) as unknown as Family

const USE: MachineUse = { bind: { mark: { part: 'indicator' } }, machine: 'indicator' }

const Offered = collection('tabs')

/**
 * A set that offers itself to its tabs, chooses the tab `active` names, and
 * hosts the indicator on them, as compose's `setting` does. The mark is
 * given a test ID.
 */
const useStrip: UseBehavior = (family, props) => {
  const { join, leave, members } = useMembers(props.children)
  const active = typeof props.active === 'string' ? props.active : ''
  const chosen = useCallback((value: string) => value === active, [active])
  const offer = useMemo<Offer>(
    () => ({
      choose: () => undefined,
      chosen,
      follows: false,
      hear: () => true,
      join,
      key: () => false,
      leave,
    }),
    [chosen, join, leave],
  )
  return merged(useIndicator(family, props, USE, members, chosen), {
    marks: [],
    parts: { indicator: { view: { testID: 'mark' } } },
    provide: (drawn) => <Offered.Provider value={offer}>{drawn}</Offered.Provider>,
  })
}

const Scrolling = element(strip(true), useStrip)
const Still = element(strip(false), useStrip)
const Tab = element(tab, behaviorFor(tab))

/** A box in the viewport, as the measure capability reads one. */
const box = (x: number, width = 60): Rect => ({ height: 32, width, x, y: 104 })

/* The strip at 16 across and 100 down, and the tabs, 60 by 32 at 4 inside it and 4 apart. */
const STRIP: Rect = { height: 40, width: 300, x: 16, y: 100 }
const LAID = [box(20), box(84), box(148)]

/* The line under `b` and under `c`, against the strip. */
const UNDER_B = { height: 2, width: 60, x: 68, y: 34 }
const UNDER_C = { height: 2, width: 60, x: 132, y: 34 }

const before = {
  environment: environment(),
  keys: keys(),
  measure: measure(),
  motion: motion(),
  timers: timers(),
}
let boxes: FakeMeasure<unknown>
let moves: FakeMotion<unknown>
let clock: FakeTimers
/* The part each tab chooses with, in the order they were drawn, as the keys capability hears them. */
let tabs: unknown[] = []

beforeEach(() => {
  const fake = fakeKeys<unknown>()
  tabs = []
  setKeys({
    ...fake,
    listen: (node, hear) => {
      tabs.push(node)
      return fake.listen(node, hear)
    },
  })
  boxes = fakeMeasure<unknown>()
  setMeasure(boxes)
  moves = fakeMotion<unknown>()
  setMotion(moves)
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setEnvironment(before.environment)
  setKeys(before.keys)
  setMeasure(before.measure)
  setMotion(before.motion)
  setTimers(before.timers)
  jest.restoreAllMocks()
})

/** The three tabs, with `active` chosen, and the tabs `first` names before them. */
const tabsOf = (active: string, Strip = Scrolling, first: readonly string[] = []) => (
  <ThemeProvider tokens={TOKENS}>
    <Strip active={active}>
      {first.map((value) => (
        <Tab key={value} value={value}>
          {value}
        </Tab>
      ))}
      <Tab key="a" value="a">
        Alpha
      </Tab>
      <Tab key="b" value="b">
        Beta
      </Tab>
      <Tab key="c" value="c">
        Gamma
      </Tab>
    </Strip>
  </ThemeProvider>
)

/** Draws the strip with `active` chosen, and lays each tab out. */
const drawStrip = async (active = 'b', Strip = Scrolling) => {
  const view = await render(tabsOf(active, Strip))
  await act(() => {
    tabs.forEach((node, at) => {
      boxes.place(node, LAID[at] ?? null)
    })
  })
  return view
}

/**
 * Lays out the view the strip's content is laid out in, and hands it to the
 * strip, as React Native does once the scroll view is drawn. The scroll
 * view's Jest mock draws no such view.
 */
const handOver = async () => {
  const content = { view: 'content' }
  boxes.place(content, STRIP)
  const [scroller] = screen.container.queryAll(
    (one) => typeof one.props.innerViewRef === 'function',
  )
  await act(() => scroller?.props.innerViewRef(content))
  return content
}

/** The strip's own view, which a screen reader hears as the tab list. */
const stripView = () => {
  const [list] = screen.container.queryAll((one) => one.props.accessibilityRole === 'tablist')
  if (list === undefined) {
    throw new Error('The strip draws no tab list.')
  }
  return list
}

/** Draws the scrolling strip with `active` chosen, with every tab and its content laid out. */
const drawn = async (active = 'b') => {
  const view = await drawStrip(active)
  const content = await handOver()
  return { content, view }
}

/** The mark as React Native draws it. */
const markView = () => screen.getByTestId('mark', { includeHiddenElements: true })

/** The view motion moves, which is the mark's. */
const markNode = () => moves.calls[0]?.node

describe('useIndicator', () => {
  test('places the mark under the chosen tab, against the strip’s content, and shows it', async () => {
    await drawStrip()
    expect(moves.calls).toEqual([])
    expect(markView()).toHaveStyle({ opacity: 0 })
    await handOver()
    expect(moves.calls.map(({ call, to }) => ({ call, to }))).toEqual([
      { call: 'place', to: UNDER_B },
    ])
    expect(markView()).toHaveStyle({ opacity: 1 })
  })

  test('glides to a new choice along the transition the mark’s style gives, and lands as it arrives', async () => {
    const { view } = await drawn()
    await view.rerender(tabsOf('c'))
    expect(moves.gliding(markNode())).toEqual({
      to: UNDER_C,
      transition: { duration: 250, easing: 'emphasized' },
    })
    expect(clock.pending().timeouts).toBe(1)
    await act(() => moves.arrive(markNode()))
    expect(clock.pending().timeouts).toBe(0)
  })

  test('hides the mark where no tab is chosen, and leaves its glide going', async () => {
    const { view } = await drawn()
    await view.rerender(tabsOf('c'))
    await view.rerender(tabsOf('none'))
    expect(markView()).toHaveStyle({ opacity: 0 })
    expect(moves.gliding(markNode())).not.toBeNull()
  })

  test('measures again when the chosen tab or the strip’s content changes size', async () => {
    const { content } = await drawn()
    await act(() => boxes.place(tabs[1], box(84, 90)))
    expect(moves.where(markNode())).toEqual({ ...UNDER_B, width: 90 })
    const placed = moves.calls.length
    await act(() => boxes.place(content, { ...STRIP, width: 360 }))
    expect(moves.calls.slice(placed).map(({ call, to }) => ({ call, to }))).toEqual([
      { call: 'place', to: { ...UNDER_B, width: 90 } },
    ])
  })

  test('measures again when the tabs change, as one added before the chosen one moves it', async () => {
    const { view } = await drawn()
    boxes.place(tabs[1], box(148))
    await view.rerender(tabsOf('b', Scrolling, ['z']))
    expect(moves.gliding(markNode())?.to).toEqual(UNDER_C)
  })

  test('places a new choice at once where reduced motion is on', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const { view } = await drawn()
    await view.rerender(tabsOf('c'))
    expect(moves.calls.map(({ call }) => call)).toEqual(['place', 'place'])
    expect(moves.where(markNode())).toEqual(UNDER_C)
  })

  test('places the mark against the box’s own view where it does not scroll, which reports its size', async () => {
    const reported = jest.spyOn(capability, 'layoutChanged')
    await drawStrip('b', Still)
    await fireEvent(stripView(), 'layout', {
      nativeEvent: { layout: { height: 40, width: 300, x: 0, y: 0 } },
    })
    const [own] = reported.mock.calls.map(([node]) => node)
    await act(() => boxes.place(own, STRIP))
    expect(moves.where(markNode())).toEqual(UNDER_B)
    expect(markView()).toHaveStyle({ opacity: 1 })
  })
})
