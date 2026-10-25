/*
 * The generated Timeline, Timeline Group and Timeline Item, drawn from their
 * real intermediate forms: a list named by its label, each entry's mark
 * named by its tone, the two rows a phone draws without a subgrid so the
 * mark sits on what happened, the line hidden before the first entry and
 * after the last, each layout's place for the time, a reading of how long
 * ago that ticks on a fake clock, and a group's heading over its own list.
 * `test:native` writes the components beside this file.
 */
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import {
  FAKE_WALL_START,
  type FakeTimers,
  fakeTimers,
} from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, Text } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { type Drawn, nodes, styleOf, wordsOf } from './drawn'
import { HelixTimeline, HelixTimelineGroup, HelixTimelineItem } from './timeline/index.native'

const original = timers()
let clock: FakeTimers

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
})

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

/** Three entries under the timeline's props: a success, a plain one, and one still to come. */
const drawn = (props: Readonly<Record<string, unknown>> = {}) =>
  themed(
    <HelixTimeline label="Deployment history" {...props}>
      <HelixTimelineItem time={<Text>09:12</Text>} tone="success">
        <Text>Deployed</Text>
      </HelixTimelineItem>
      <HelixTimelineItem time={<Text>08:30</Text>}>
        <Text>Build passed</Text>
      </HelixTimelineItem>
      <HelixTimelineItem pending time={<Text>10:00</Text>}>
        <Text>Release review</Text>
      </HelixTimelineItem>
    </HelixTimeline>,
  )

/** The node drawn with these words that is not hidden by its own style or a style around it. */
const shown = (words: string): boolean => {
  const all = nodes(screen.toJSON())
  const hidden = all.filter((node) => styleOf(node).display === 'none')
  return all.some(
    (node) =>
      node.type === 'Text' &&
      wordsOf(node) === words &&
      !hidden.some((one) => nodes(one).includes(node)),
  )
}

/** The entries, as the timeline draws them. */
const entries = (): Drawn[] =>
  (nodes(screen.toJSON())[0]?.children ?? []).filter(
    (child): child is Drawn => typeof child !== 'string',
  )

/** The arriving line of each entry: the first child of the line beside its time. */
const arriving = (): Drawn[] =>
  entries().map((entry) => {
    const head = (entry.children ?? [])[0] as Drawn
    const arrive = (head.children ?? [])[1] as Drawn
    return (arrive.children ?? [])[0] as Drawn
  })

describe('the generated Timeline', () => {
  test('is a list named by its label, its marks named by their tones', async () => {
    await render(drawn())
    const list = nodes(screen.toJSON())[0]
    expect(list?.props.accessibilityRole).toBe('list')
    expect(list?.props.accessibilityLabel).toBe('Deployment history')
    const named = nodes(screen.toJSON())
      .map((node) => node.props.accessibilityLabel)
      .filter((label) => label === 'Success' || label === 'Scheduled')
    expect(named).toEqual(['Success', 'Scheduled'])
    const marks = nodes(screen.toJSON()).filter(
      (node) => node.props.accessibilityLabel === 'Success',
    )
    expect(marks.map((node) => node.props.accessibilityRole)).toEqual(['image'])
  })

  test('draws the time once, over what happened, and the mark beside what happened', async () => {
    await render(drawn())
    const shownTimes = ['09:12', '08:30', '10:00'].filter(shown)
    expect(shownTimes).toEqual(['09:12', '08:30', '10:00'])
    const [first] = entries()
    const [head, body] = (first?.children ?? []) as Drawn[]
    expect(styleOf(head ?? { props: {} }).flexDirection).toBe('row')
    /* The mark is in the second row, beside what happened. */
    expect(nodes(body as Drawn).some((one) => one.props.accessibilityLabel === 'Success')).toBe(
      true,
    )
  })

  test('hides the line before the first entry, and dashes the way to one still to come', async () => {
    await render(drawn())
    const lines = arriving()
    expect(styleOf(lines[0] ?? { props: {} }).opacity).toBe(0)
    expect(styleOf(lines[1] ?? { props: {} }).opacity).toBeUndefined()
    /* The web's repeating gradient, as one tile of a dash and a gap, repeated. */
    const pending = styleOf(lines[2] ?? { props: {} })
    expect(pending.backgroundImage).toMatch(/^linear-gradient\(to bottom,/)
    expect(pending.backgroundRepeat).toBe('repeat')
    expect(pending.backgroundSize).toBe('100% 8px')
  })

  test('puts the time before the line under opposite, and on the far side under alternate', async () => {
    const view = await render(drawn({ layout: 'opposite' }))
    expect(styleOf(entries()[0]?.children?.[0] as Drawn).display).toBe('none')
    expect(shown('09:12')).toBe(true)
    await view.rerender(drawn({ layout: 'alternate' }))
    const even = entries()[1]?.children?.[1] as Drawn
    expect(styleOf(even).flexDirection).toBe('row-reverse')
    expect(['09:12', '08:30'].filter(shown)).toEqual(['09:12', '08:30'])
  })

  test('runs across under horizontal, each time under its mark', async () => {
    await render(drawn({ orientation: 'horizontal' }))
    expect(styleOf(nodes(screen.toJSON())[0] ?? { props: {} }).flexDirection).toBe('row')
    const body = entries()[0]?.children?.[1] as Drawn
    expect(styleOf(body).flexDirection).toBe('column')
    expect(shown('09:12')).toBe(true)
  })

  test('keeps each entry across six of its ems wide, at the largest text size too', async () => {
    const least: number[] = []
    for (const fontScale of [1, 3.1]) {
      Dimensions.set({
        screen: { ...Dimensions.get('screen'), fontScale },
        window: { ...Dimensions.get('window'), fontScale },
      })
      await render(drawn({ orientation: 'horizontal' }))
      least.push(Number(styleOf(entries()[0] ?? { props: {} }).minWidth))
    }
    /* Six ems of the page's 14-point words, and as many more as the text grows. */
    expect(least[0]).toBeCloseTo(6 * 14, 0)
    expect((least[1] ?? 0) / (least[0] ?? 1)).toBeCloseTo(3.1, 1)
    Dimensions.set({
      screen: { ...Dimensions.get('screen'), fontScale: 1 },
      window: { ...Dimensions.get('window'), fontScale: 1 },
    })
  })

  test('writes how long ago it was under relative, and ticks as the words go stale', async () => {
    const at = new Date(FAKE_WALL_START - 59 * 60_000).toISOString()
    await render(
      themed(
        <HelixTimeline>
          <HelixTimelineItem datetime={at} relative="long">
            <Text>Deployed</Text>
          </HelixTimelineItem>
        </HelixTimeline>,
      ),
    )
    expect(shown('59 minutes ago')).toBe(true)
    await act(async () => {
      clock.advance(60_000)
    })
    expect(shown('1 hour ago')).toBe(true)
  })

  test('draws a group as a heading over a list of its own', async () => {
    await render(
      themed(
        <HelixTimeline>
          <HelixTimelineGroup label="Today">
            <HelixTimelineItem time={<Text>09:12</Text>}>
              <Text>Deployed</Text>
            </HelixTimelineItem>
          </HelixTimelineGroup>
        </HelixTimeline>,
      ),
    )
    const all = nodes(screen.toJSON())
    expect(all.some((one) => one.props.accessibilityRole === 'header')).toBe(true)
    expect(
      all.some(
        (one) => one.props.accessibilityRole === 'list' && one.props.accessibilityLabel === 'Today',
      ),
    ).toBe(true)
    expect(shown('Today')).toBe(true)
  })

  test('names the list of a group by the heading passed in, as the web does', async () => {
    await render(
      themed(
        <HelixTimeline>
          <HelixTimelineGroup heading={<Text>Yesterday</Text>}>
            <HelixTimelineItem time={<Text>18:40</Text>}>
              <Text>Rolled back</Text>
            </HelixTimelineItem>
          </HelixTimelineGroup>
        </HelixTimeline>,
      ),
    )
    const list = nodes(screen.toJSON()).find(
      (one) => one.props.accessibilityRole === 'list' && one.props.accessibilityLabel !== undefined,
    )
    expect(list?.props.accessibilityLabel).toBe('Yesterday')
  })
})
