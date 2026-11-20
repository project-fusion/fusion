/*
 * The generated Outline, drawn from its real intermediate form: a
 * navigation that draws a link for each section the page registers with
 * `useSection`, nested by level, marks the link of the section being read as
 * the page scrolls, sends `activate` with its id, and scrolls to a section
 * when its link is pressed. `test:native` writes the component beside this
 * file.
 */
import { type Measure, measure, setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { motion, setMotion } from '@fusion.dev/helix-core/capabilities/motion'
import { type FakeMotion, fakeMotion } from '@fusion.dev/helix-core/capabilities/motion/fake'
import { type Scroll, scroll, setScroll } from '@fusion.dev/helix-core/capabilities/scroll'
import type { Rect } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { type HostInstance, Text, View } from 'react-native'
import { useSection } from '../render/sections'
import { HelixTheme } from '../theme/helix-theme'
import { nodes, styleOf } from './drawn'
import { HelixOutline } from './outline/index.native'

/* The scroll view the sections are drawn in, which a phone finds above them. */
const mockView = { scrollTo: jest.fn() } as unknown as HostInstance
jest.mock('../capabilities/scroll', () => ({
  ...jest.requireActual<typeof import('../capabilities/scroll')>('../capabilities/scroll'),
  scrollViewAbove: () => mockView,
}))

/** Where each section's top stands, by its id, as the page scrolls. */
let tops: Record<string, number> = {}
/** How tall each section is. */
let tall = 100
/** The links' order down the rail, by their words, each 24 tall. */
const RAIL = ['Install', 'Props', 'Events']
let moves: FakeMotion<unknown>

/** The words a drawn view holds, read through its children. */
const wordsIn = (children: unknown): string =>
  typeof children === 'string'
    ? children
    : Array.isArray(children)
      ? children.map(wordsIn).join('')
      : typeof children === 'object' && children !== null && 'props' in children
        ? wordsIn((children as { props: { children?: unknown } }).props.children)
        : ''
let offsetY = 0
const boxes = new Map<unknown, string>()
let observed: ((scrolled: never) => void) | undefined
const moved: { y: number; smooth: boolean }[] = []

const original = { measure: measure(), motion: motion(), scroll: scroll() }

beforeEach(() => {
  tops = {}
  tall = 100
  offsetY = 0
  moved.length = 0
  moves = fakeMotion<unknown>()
  setMotion(moves)
  setMeasure({
    box: (node: unknown): Rect | null => {
      if (node === mockView) {
        return { height: 400, width: 300, x: 0, y: 0 }
      }
      /* The rail at the top left, and each link on it by its words. */
      const props = (node as { props?: Record<string, unknown> } | null)?.props
      if (props?.role === 'navigation') {
        return { height: 72, width: 200, x: 0, y: 0 }
      }
      if (typeof props?.onClick === 'function') {
        const at = RAIL.indexOf(wordsIn(props.children))
        return at < 0 ? null : { height: 24, width: 200, x: 0, y: at * 24 }
      }
      const id = boxes.get(node)
      return id === undefined
        ? null
        : { height: tall, width: 300, x: 0, y: (tops[id] ?? 0) - offsetY }
    },
    observe: () => () => undefined,
  } as Measure<unknown>)
  setScroll({
    ...original.scroll,
    observe: (_node: unknown, changed: (scrolled: never) => void) => {
      observed = changed
      return () => {
        observed = undefined
      }
    },
    offset: () => ({ x: 0, y: offsetY }),
    to: (_node: unknown, _x: number, y: number, smooth: boolean) => {
      moved.push({ smooth, y })
    },
  } as Scroll<unknown>)
})

afterEach(() => {
  setMeasure(original.measure)
  setMotion(original.motion)
  setScroll(original.scroll)
})

/** A section of the page, registered under its id. */
const Section = ({ id, label, level }: { id: string; label: string; level?: number }) => {
  const held = useSection(id, { label, ...(level === undefined ? {} : { level }) })
  return (
    <View
      ref={(node) => {
        held(node as HostInstance | null)
        if (node !== null) {
          boxes.set(node, id)
        }
      }}
    >
      <Text>{label} body</Text>
    </View>
  )
}

const page = (outline: ReactNode) => (
  <HelixTheme mode="light">
    {outline}
    <Section id="install" label="Install" />
    <Section id="props" label="Props" level={2} />
    <Section id="events" label="Events" level={2} />
  </HelixTheme>
)

/** Scrolls the page to `y`, as the scroll mockView tells where it stands. */
const scrollTo = async (y: number) => {
  offsetY = y
  await act(async () =>
    observed?.({
      offset: { x: 0, y },
      settled: false,
      x: { end: true, start: true },
      y: { end: false, start: y === 0 },
    } as never),
  )
}

/** The links, by their words, with what a screen reader is told of each. */
const link = (words: string) =>
  nodes(screen.toJSON()).find(
    (node) =>
      node.type !== 'Text' &&
      JSON.stringify(node.children ?? []).includes(`"${words}"`) &&
      typeof node.props.onClick === 'function',
  )

describe('the generated Outline', () => {
  test('draws a link for each section, nested by level, and names its navigation', async () => {
    tops = { events: 900, install: 0, props: 500 }
    await render(page(<HelixOutline />))
    expect(screen.getByText('Install')).toBeTruthy()
    expect(screen.getByText('Props')).toBeTruthy()
    const nav = nodes(screen.toJSON()).find(
      (node) => node.props.accessibilityLabel === 'On this page',
    )
    expect(nav).toBeDefined()
    const install = styleOf(link('Install') ?? { props: {} })
    const props = styleOf(link('Props') ?? { props: {} })
    expect(Number(props.paddingStart)).toBeGreaterThan(Number(install.paddingHorizontal))
  })

  test('marks the section being read as the page scrolls, and sends activate', async () => {
    tops = { events: 900, install: 0, props: 500 }
    const heard: string[] = []
    await render(
      page(<HelixOutline onActivate={(event) => heard.push(String(event.detail.value))} />),
    )
    expect(heard).toEqual(['install'])
    await scrollTo(520)
    expect(heard).toEqual(['install', 'props'])
    expect(link('Props')?.props.accessibilityValue).toEqual({ text: 'Current location' })
    expect(link('Install')?.props.accessibilityValue).toEqual({})
  })

  test('moves one mark along the rail to the marked link, as the web’s mark travels', async () => {
    tops = { events: 900, install: 0, props: 500 }
    await render(page(<HelixOutline />))
    const mark = moves.calls[0]?.node
    expect(moves.where(mark).y).toBe(0)
    expect(moves.where(mark).height).toBe(24)
    await scrollTo(520)
    const glide = moves.gliding(mark)
    await act(() => moves.arrive(mark))
    expect(glide === null ? moves.where(mark).y : glide.to.y).toBe(24)
    expect(moves.where(mark).y).toBe(24)
    expect(nodes(link('Props') ?? null).some((node) => styleOf(node).position === 'absolute')).toBe(
      false,
    )
  })

  test('marks the last section at once where the page does not scroll, and sends one activate', async () => {
    tops = { events: 120, install: 0, props: 60 }
    tall = 60
    const heard: string[] = []
    await render(
      page(<HelixOutline onActivate={(event) => heard.push(String(event.detail.value))} />),
    )
    expect(heard).toEqual(['events'])
    expect(link('Events')?.props.accessibilityValue).toEqual({ text: 'Current location' })
  })

  test('goes to a section when its link is pressed, gliding under smooth', async () => {
    tops = { events: 900, install: 0, props: 500 }
    await render(page(<HelixOutline behavior="smooth" offset={40} />))
    await fireEvent.press(screen.getByText('Events'))
    expect(moved).toEqual([{ smooth: true, y: 860 }])
  })
})
