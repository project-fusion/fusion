/*
 * The generated Outline under `follow`, and the generated Outline Section:
 * each link takes a ref of its own, so the marked link is revealed in the
 * scroll view the links are drawn in, and never in the one the sections
 * scroll in; a section written once registers for the outline a phone
 * draws. `test:native` writes the components beside this file.
 */
import { type Measure, measure, setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { type Scroll, scroll, setScroll } from '@fusion.dev/helix-core/capabilities/scroll'
import type { Rect } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { type HostInstance, Text, View } from 'react-native'
import { reveal } from '../machines/follow'
import { useSection } from '../render/sections'
import { HelixTheme } from '../theme/helix-theme'
import { HelixOutline, HelixOutlineSection } from './outline/index.native'

/* The scroll view the sections scroll in, and the rail the links scroll in. */
const mockPage = { scrollTo: jest.fn() } as unknown as HostInstance
const mockRail = { scrollTo: jest.fn() } as unknown as HostInstance
const mockSections = new Map<unknown, string>()
jest.mock('../capabilities/scroll', () => ({
  ...jest.requireActual<typeof import('../capabilities/scroll')>('../capabilities/scroll'),
  scrollViewAbove: (node: unknown) =>
    mockSections.has(node) || node === mockPage ? mockPage : mockRail,
}))

let tops: Record<string, number> = {}
let offsetY = 0
let observed: ((scrolled: never) => void) | undefined
const revealed: unknown[] = []
const original = { measure: measure(), scroll: scroll() }

beforeEach(() => {
  tops = { events: 900, install: 0, props: 500 }
  offsetY = 0
  revealed.length = 0
  mockSections.clear()
  setMeasure({
    box: (node: unknown): Rect | null => {
      if (node === mockPage) {
        return { height: 400, width: 300, x: 0, y: 0 }
      }
      const id = mockSections.get(node)
      return id === undefined
        ? null
        : { height: 100, width: 300, x: 0, y: (tops[id] ?? 0) - offsetY }
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
    reveal: (node: unknown) => {
      revealed.push(node)
    },
    to: () => undefined,
  } as Scroll<unknown>)
})

afterEach(() => {
  setMeasure(original.measure)
  setScroll(original.scroll)
})

const Section = ({ id, label }: { id: string; label: string }) => {
  const held = useSection(id, { label })
  return (
    <View
      ref={(node) => {
        held(node as HostInstance | null)
        if (node !== null) {
          mockSections.set(node, id)
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
    <Section id="props" label="Props" />
    <Section id="events" label="Events" />
  </HelixTheme>
)

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

describe('the generated Outline under follow', () => {
  test('reveals the marked link in the links’ own scroll view, each link by its own ref', async () => {
    await render(page(<HelixOutline follow />))
    expect(revealed).toHaveLength(1)
    await scrollTo(520)
    expect(revealed).toHaveLength(2)
    /* A ref the copies shared would hold the last link drawn for every one. */
    expect(revealed[1]).not.toBe(revealed[0])
    await scrollTo(0)
    expect(revealed[2]).toBe(revealed[0])
  })

  test('reveals nothing without follow', async () => {
    await render(page(<HelixOutline />))
    await scrollTo(520)
    expect(revealed).toEqual([])
  })

  test('never moves the scroll view the sections scroll in', () => {
    /* Links drawn in the page's own scroll view, beside the sections. */
    const section = { parentElement: mockPage } as unknown as HostInstance
    const link = { parentElement: mockPage } as unknown as HostInstance
    mockSections.set(link, 'install')
    reveal(link, section)
    expect(revealed).toEqual([])
  })
})

describe('the generated Outline Section', () => {
  test('registers under its anchor, with its words and level, for the outline a phone draws', async () => {
    await render(
      <HelixTheme mode="light">
        <HelixOutline />
        <HelixOutlineSection anchor="install" label="Install">
          <Text>Install body</Text>
        </HelixOutlineSection>
        <HelixOutlineSection anchor="props" label="Props" level={2}>
          <Text>Props body</Text>
        </HelixOutlineSection>
      </HelixTheme>,
    )
    expect(screen.getByText('Install')).toBeTruthy()
    expect(screen.getByText('Props')).toBeTruthy()
    expect(screen.getByText('Props body')).toBeTruthy()
  })
})
